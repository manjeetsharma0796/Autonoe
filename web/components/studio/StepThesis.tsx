"use client";

import { useRef, useState } from "react";
import type { AIRole, AssetSymbol, Thesis, ThesisOption } from "@autonoe/shared";
import { SUBAGENT_ROLES } from "@autonoe/shared";
import { keccak256, stringToHex } from "viem";
import type { ExecuteResult } from "@autonoe/wallet";
import styles from "./studio.module.css";
import { ThinkingTrace } from "./ThinkingTrace";
import {
  ArrowRightIcon,
  ClockIcon,
  IndicatorsIcon,
  MarketIcon,
  NewsIcon,
  OnChainIcon,
  PenIcon,
  SparkIcon,
  SparkSingleIcon,
  TrendUpIcon,
  WarnIcon,
} from "./icons";
import {
  DATA_SOURCES,
  DEFAULT_HUMAN_CASE,
  DEFAULT_INTENT,
  DEFAULT_SOURCES,
  type DataSourceKey,
} from "./data";
import { postThesisHuman } from "@/lib/api";
import { streamSSE } from "@/lib/stream";
import { LiveThinking } from "@/components/ai/LiveThinking";
import { Button } from "@/components/ui/Button";
import { useWallet } from "@/components/wallet/WalletProvider";
import { ExecuteModal } from "@/components/wallet/ExecuteModal";
import { ShareButton } from "@/components/share/ShareCard";

type Mode = "ai" | "human";

const SOURCE_ICON: Record<DataSourceKey, typeof OnChainIcon> = {
  onchain: OnChainIcon,
  market: MarketIcon,
  indicators: IndicatorsIcon,
  news: NewsIcon,
};

/** Map DataSourceKey to the AIRole used in activeSources. */
const SOURCE_TO_ROLE: Record<DataSourceKey, AIRole> = {
  onchain: "subagent.onchain",
  market: "subagent.market",
  indicators: "subagent.indicators",
  news: "subagent.news",
};

function directionLabel(d: ThesisOption["direction"]): string {
  return d.charAt(0).toUpperCase() + d.slice(1);
}

function formatRange(low: number, high: number): string {
  const fmt = (n: number) =>
    (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
  return `${fmt(low)} to ${fmt(high)}`;
}

// ── ThesisOptionCard ──────────────────────────────────────────────────────────

function ThesisOptionCard({
  opt,
  thesis,
  intent,
  onSendToJudge,
}: {
  opt: ThesisOption;
  thesis: Thesis;
  intent: string;
  onSendToJudge: () => void;
}) {
  const wallet = useWallet();
  const [modalOpen, setModalOpen] = useState(false);
  const dir = opt.direction;

  async function handleConfirm(passphrase: string | null): Promise<ExecuteResult> {
    // If locked and passphrase provided, unlock first then execute.
    if (!wallet.isUnlocked && passphrase) {
      await wallet.unlock(passphrase);
    }
    // Zero verdictHash for direct execution (not judged).
    const zeroHash = `0x${"0".repeat(64)}` as `0x${string}`;
    const thesisHash = keccak256(stringToHex(thesis.id));

    return wallet.execute(
      {
        direction: opt.direction,
        asset: opt.asset,
        sizeMUSD: opt.sizeMUSD,
        optionRef: opt.id,
        apiBase: "",
      },
      { thesisHash, verdictHash: zeroHash },
    );
  }

  return (
    <>
      <article className={`${styles.opt} ${styles[opt.risk]}`}>
        <div className={styles.otop}>
          <span className={`${styles.dir} ${styles[dir]}`}>
            <TrendUpIcon /> {directionLabel(dir)}
          </span>
          <span className={`${styles.riskpill} ${styles[opt.risk]}`}>
            {opt.risk} risk
          </span>
        </div>
        <div className={styles.asset}>{opt.asset}</div>
        <div className={styles.size}>
          Size <b>{opt.sizeMUSD.toLocaleString()} mUSD</b> · {opt.id}
        </div>
        <p className={styles.rat}>{opt.rationale}</p>
        <div className={styles.ret}>
          <span className={styles.rk}>Predicted</span>
          <span className={styles.rv}>
            {formatRange(opt.predictedReturnPct.low, opt.predictedReturnPct.high)}
          </span>
        </div>
        <div className={styles.acts}>
          <button
            className={`btn btn-ghost ${styles.btnSm}`}
            type="button"
            disabled={opt.direction === "hold" || !wallet.isCreated}
            title={!wallet.isCreated ? "Create an agent wallet to execute" : opt.direction === "hold" ? "Hold - no trade" : "Execute this option"}
            onClick={() => setModalOpen(true)}
          >
            Execute
          </button>
          <button
            className={`btn btn-gold ${styles.btnSm}`}
            type="button"
            onClick={onSendToJudge}
          >
            <ArrowRightIcon />
            To Judge
          </button>
          <ShareButton
            className={styles.btnSm}
            label="Share"
            data={{
              intent,
              direction: opt.direction,
              asset: opt.asset,
              sizeMUSD: opt.sizeMUSD,
              predictedReturnLabel: formatRange(opt.predictedReturnPct.low, opt.predictedReturnPct.high),
              risk: opt.risk,
            }}
          />
        </div>
      </article>

      {modalOpen && (
        <ExecuteModal
          option={{
            id: opt.id,
            direction: opt.direction,
            asset: opt.asset,
            sizeMUSD: opt.sizeMUSD,
            predictedReturnLabel: formatRange(opt.predictedReturnPct.low, opt.predictedReturnPct.high),
            risk: opt.risk,
          }}
          onConfirm={handleConfirm}
          onClose={() => setModalOpen(false)}
          isUnlocked={wallet.isUnlocked}
        />
      )}
    </>
  );
}

export interface StepThesisProps {
  /** Called when the user clicks "To Judge" on any option. */
  onSendToJudge: (thesis: Thesis) => void;
}

export function StepThesis({ onSendToJudge }: StepThesisProps) {
  const [intent, setIntent] = useState(DEFAULT_INTENT);
  const [humanCase, setHumanCase] = useState(DEFAULT_HUMAN_CASE);
  const [mode, setMode] = useState<Mode>("ai");
  const [sources, setSources] =
    useState<Record<DataSourceKey, boolean>>(DEFAULT_SOURCES);

  const [thesis, setThesis] = useState<Thesis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thinking, setThinking] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const toggleSource = (key: DataSourceKey) =>
    setSources((s) => ({ ...s, [key]: !s[key] }));

  const activeSources: AIRole[] = SUBAGENT_ROLES.filter(
    (r) => {
      // find the DataSourceKey that maps to this role
      const key = (Object.keys(SOURCE_TO_ROLE) as DataSourceKey[]).find(
        (k) => SOURCE_TO_ROLE[k] === r
      );
      return key !== undefined && sources[key];
    }
  );

  async function handleGenerate() {
    // Cancel any previous in-flight stream.
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setError(null);
    setThesis(null);
    setThinking("");

    try {
      await streamSSE(
        "/api/thesis/stream",
        { intent, activeSources },
        {
          signal: ac.signal,
          onEvent(event, data) {
            if (event === "thinking") {
              const d = data as { delta?: string };
              if (d.delta) setThinking((t) => t + d.delta);
            } else if (event === "result") {
              setThesis(data as Thesis);
            } else if (event === "error") {
              const d = data as { error?: string };
              setError(d.error ?? "Unknown streaming error");
            }
          },
        }
      );
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleStructure() {
    setLoading(true);
    setError(null);
    setThesis(null);
    try {
      // Default to WMNT as suggestedPair; user can adjust intent to imply different asset
      const suggestedPair: AssetSymbol = "WMNT";
      const result = await postThesisHuman({
        intent,
        body: humanCase,
        suggestedPair,
      });
      setThesis(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const enabledCount = Object.values(sources).filter(Boolean).length;

  return (
    <section className="wrap" id="step-1">
      <div className={`${styles.block} reveal`}>
        <span className={styles.blab}>Intent</span>
        <h3>What do you want Autonoe to consider?</h3>
        <p className={styles.bnote}>
          Describe a market view, a question, or a goal. The agent researches
          across the data sources you enable below.
        </p>

        <div className={styles.field}>
          <label htmlFor="intent">Your intent</label>
          <input
            className={styles.inp}
            id="intent"
            type="text"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label>Data sources</label>
          <div className={styles.chips} role="group" aria-label="Data sources">
            {DATA_SOURCES.map((src) => {
              const Icon = SOURCE_ICON[src.key];
              return (
                <button
                  key={src.key}
                  className={styles.chip}
                  type="button"
                  aria-pressed={sources[src.key]}
                  onClick={() => toggleSource(src.key)}
                >
                  <Icon />
                  {src.label} <span className={styles.tick} />
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.field}>
          <label>Mode</label>
          <br />
          <div
            className={styles.modes}
            role="tablist"
            aria-label="Thesis authoring mode"
          >
            <button
              className={`${styles.mode} ${styles.ai} ${mode === "ai" ? styles.on : ""}`}
              role="tab"
              type="button"
              aria-selected={mode === "ai"}
              onClick={() => setMode("ai")}
            >
              <SparkIcon />
              Create with AI
            </button>
            <button
              className={`${styles.mode} ${mode === "human" ? styles.on : ""}`}
              role="tab"
              type="button"
              aria-selected={mode === "human"}
              onClick={() => setMode("human")}
            >
              <PenIcon />
              Write your own
            </button>
          </div>

          {mode === "ai" ? (
            <div className={styles.modepane} id="pane-ai">
              <div className={styles.runrow}>
                <Button
                  variant="gold"
                  loading={loading}
                  onClick={handleGenerate}
                  iconLeft={<SparkSingleIcon />}
                >
                  {loading ? "Generating" : "Generate thesis"}
                </Button>
                <span className={styles.hint}>
                  <ClockIcon />
                  {enabledCount} subagent{enabledCount !== 1 ? "s" : ""} active · ~5s to multi-option thesis
                </span>
              </div>
            </div>
          ) : (
            <div className={styles.modepane} id="pane-human">
              <div className={styles.field} style={{ marginTop: 18 }}>
                <label htmlFor="human-case">Your case</label>
                <textarea
                  className={styles.inp}
                  id="human-case"
                  placeholder="Write your own thesis - direction, asset, sizing logic and why. We'll structure it into options you can send to the Judge Panel."
                  value={humanCase}
                  onChange={(e) => setHumanCase(e.target.value)}
                />
              </div>
              <div className={styles.runrow}>
                <Button
                  variant="gold"
                  loading={loading}
                  onClick={handleStructure}
                  iconLeft={<ArrowRightIcon />}
                >
                  {loading ? "Structuring" : "Structure into options"}
                </Button>
                <span className={styles.hint}>
                  <PenIcon />
                  Human-authored · source tagged for the leaderboard
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Error state */}
        {error && (
          <div className={styles.notice} style={{ marginTop: 16 }}>
            <WarnIcon />
            {error}
          </div>
        )}

        {/* Live streaming thinking panel - visible while streaming and collapsible after */}
        {(thinking || loading) && (
          <div style={{ marginTop: 16 }}>
            <LiveThinking text={thinking} streaming={loading} />
          </div>
        )}

        {/* Reasoning traces from the live thesis */}
        {thesis && thesis.traces && thesis.traces.length > 0 && (
          <div style={{ marginTop: 16 }}>
            {thesis.traces.map((t, i) => (
              <ThinkingTrace key={i} trace={t} />
            ))}
          </div>
        )}

        {/* Fallback: show overall thesis reasoning if no per-agent traces */}
        {thesis && (!thesis.traces || thesis.traces.length === 0) && thesis.reasoning && (
          <ThinkingTrace
            summary={thesis.reasoning.slice(0, 100)}
            steps={[{ label: "reasoning", detail: thesis.reasoning }]}
          />
        )}
      </div>

      {/* Options grid - only shown after a successful thesis call */}
      {thesis && thesis.options.length > 0 && (
        <>
          <div className={`${styles.opthead} reveal`}>
            <h3>Thesis options</h3>
            <span className={styles.cnt}>
              {thesis.options.length} risk-tiered candidate{thesis.options.length !== 1 ? "s" : ""} · suggested pair mUSD/{thesis.suggestedPair}
            </span>
          </div>
          <div className={styles.optgrid}>
            {thesis.options.map((opt) => (
              <div className="reveal" key={opt.id}>
                <ThesisOptionCard
                  opt={opt}
                  thesis={thesis}
                  intent={intent}
                  onSendToJudge={() => onSendToJudge(thesis)}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty state after a successful call with no options */}
      {thesis && thesis.options.length === 0 && (
        <div className={`${styles.notice} reveal`}>
          <WarnIcon />
          The agent could not generate thesis options for this intent. Try rephrasing or enabling more data sources.
        </div>
      )}

      <div className={`${styles.notice} reveal`}>
        <WarnIcon />
        Testnet · not financial advice. The agent never auto-executes - you
        confirm every trade.
      </div>
    </section>
  );
}
