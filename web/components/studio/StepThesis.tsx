"use client";

import { useState } from "react";
import Link from "next/link";
import type { AssetSymbol, Thesis, ThesisOption } from "@autonoe/shared";
import { ASSET_SYMBOLS } from "@autonoe/shared";
import styles from "./studio.module.css";
import { ThinkingTrace } from "./ThinkingTrace";
import { ShareButton } from "../share/ShareCard";
import { ApiError, generateThesis, structureHumanThesis } from "@/lib/api";
import { bandLabel, dirLabel, moneyMUSD } from "./format";
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

type Mode = "ai" | "human";

const SOURCE_ICON: Record<DataSourceKey, typeof OnChainIcon> = {
  onchain: OnChainIcon,
  market: MarketIcon,
  indicators: IndicatorsIcon,
  news: NewsIcon,
};

/** UI data-source toggle → server subagent role id. */
const SOURCE_ROLE: Record<DataSourceKey, string> = {
  onchain: "subagent.onchain",
  market: "subagent.market",
  indicators: "subagent.indicators",
  news: "subagent.news",
};

function ThesisOptionCard({
  opt,
  onSendToJudge,
}: {
  opt: ThesisOption;
  onSendToJudge: () => void;
}) {
  return (
    <article className={`${styles.opt} ${styles[opt.risk]}`}>
      <div className={styles.otop}>
        <span className={`${styles.dir} ${styles[opt.direction]}`}>
          <TrendUpIcon /> {dirLabel(opt.direction)}
        </span>
        <span className={`${styles.riskpill} ${styles[opt.risk]}`}>
          {opt.risk} risk
        </span>
      </div>
      <div className={styles.asset}>{opt.asset}</div>
      <div className={styles.size}>
        Size <b>{moneyMUSD(opt.sizeMUSD)}</b> · {opt.id}
      </div>
      <p className={styles.rat}>{opt.rationale}</p>
      <div className={styles.ret}>
        <span className={styles.rk}>Predicted</span>
        <span className={styles.rv}>{bandLabel(opt.predictedReturnPct)}</span>
      </div>
      <div className={styles.acts}>
        <button className={`btn btn-ghost ${styles.btnSm}`} type="button">
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
      </div>
    </article>
  );
}

export function StepThesis({
  thesis,
  onThesis,
  onSendToJudge,
}: {
  thesis: Thesis | null;
  onThesis: (t: Thesis) => void;
  onSendToJudge: () => void;
}) {
  const [intent, setIntent] = useState(DEFAULT_INTENT);
  const [humanCase, setHumanCase] = useState(DEFAULT_HUMAN_CASE);
  const [mode, setMode] = useState<Mode>("ai");
  const [pair, setPair] = useState<AssetSymbol>("WMNT");
  const [sources, setSources] =
    useState<Record<DataSourceKey, boolean>>(DEFAULT_SOURCES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSource = (key: DataSourceKey) =>
    setSources((s) => ({ ...s, [key]: !s[key] }));

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const next =
        mode === "ai"
          ? await generateThesis(
              intent,
              (Object.keys(sources) as DataSourceKey[])
                .filter((k) => sources[k])
                .map((k) => SOURCE_ROLE[k]),
            )
          : await structureHumanThesis({
              intent,
              body: humanCase,
              suggestedPair: pair,
            });
      onThesis(next);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Something went wrong generating the thesis.",
      );
    } finally {
      setLoading(false);
    }
  };

  const options = thesis?.options ?? [];

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
                <button
                  className="btn btn-gold"
                  type="button"
                  onClick={run}
                  disabled={loading || !intent.trim()}
                >
                  <SparkSingleIcon />
                  {loading ? "Generating…" : "Generate thesis"}
                </button>
                <span className={styles.hint}>
                  <ClockIcon />
                  {loading
                    ? "Subagents researching across enabled sources…"
                    : "Subagents research, then synthesize a multi-option thesis"}
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
                  placeholder="Write your own thesis — direction, asset, sizing logic and why. We'll structure it into options you can send to the Judge Panel."
                  value={humanCase}
                  onChange={(e) => setHumanCase(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="pair">Suggested pair</label>
                <select
                  className={styles.inp}
                  id="pair"
                  value={pair}
                  onChange={(e) => setPair(e.target.value as AssetSymbol)}
                >
                  {ASSET_SYMBOLS.map((s) => (
                    <option key={s} value={s}>
                      mUSD/{s}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.runrow}>
                <button
                  className="btn btn-gold"
                  type="button"
                  onClick={run}
                  disabled={loading || !humanCase.trim()}
                >
                  <ArrowRightIcon />
                  {loading ? "Structuring…" : "Structure into options"}
                </button>
                <span className={styles.hint}>
                  <PenIcon />
                  Human-authored · source tagged for the leaderboard
                </span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className={`${styles.notice}`} style={{ marginTop: 18 }}>
            <WarnIcon />
            {error} —{" "}
            <Link href="/settings" style={{ color: "var(--gold2)" }}>
              add a provider key in Settings
            </Link>
            .
          </div>
        )}

        {thesis?.traces?.length
          ? thesis.traces.map((t, i) => (
              <ThinkingTrace
                key={i}
                summary={t.summary}
                steps={t.steps}
                role={t.role}
              />
            ))
          : thesis?.reasoning && (
              <ThinkingTrace
                summary="— thesis reasoning"
                steps={[{ label: "synthesis", detail: thesis.reasoning }]}
              />
            )}
      </div>

      {options.length > 0 && (
        <>
          <div className={`${styles.opthead} reveal`}>
            <h3>Thesis options</h3>
            <span className={styles.cnt}>
              {options.length} risk-tiered candidate{options.length === 1 ? "" : "s"} ·
              suggested pair mUSD/{thesis?.suggestedPair}
            </span>
            <ShareButton
              data={{
                kind: "thesis",
                title: `${thesis?.intent ?? "Thesis"}`,
                subtitle: `Autonoe thesis · suggested pair mUSD/${thesis?.suggestedPair}`,
                stats: [
                  { label: "pair", value: `mUSD/${thesis?.suggestedPair}` },
                  { label: "options", value: String(options.length) },
                ],
              }}
            />
          </div>
          <div className={styles.optgrid}>
            {options.map((opt) => (
              <div className="reveal" key={opt.id}>
                <ThesisOptionCard opt={opt} onSendToJudge={onSendToJudge} />
              </div>
            ))}
          </div>
        </>
      )}

      <div className={`${styles.notice} reveal`}>
        <WarnIcon />
        Testnet · not financial advice. The agent never auto-executes — you
        confirm every trade.
      </div>
    </section>
  );
}
