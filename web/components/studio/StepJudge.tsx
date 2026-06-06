"use client";

import { useEffect, useRef, useState } from "react";
import type { DebateResult, RefinedOption, Thesis } from "@autonoe/shared";
import { keccak256, stringToHex } from "viem";
import type { ExecuteResult } from "@autonoe/wallet";
import styles from "./studio.module.css";
import { ThinkingTrace } from "./ThinkingTrace";
import { TribunalFlow } from "./TribunalFlow";
import { ArrowRightIcon, WarnIcon } from "./icons";
import { streamSSE } from "@/lib/stream";
import { LiveThinking } from "@/components/ai/LiveThinking";
import { TradingViewChart } from "@/components/charts/TradingViewChart";
import { useWallet } from "@/components/wallet/WalletProvider";
import { ExecuteModal } from "@/components/wallet/ExecuteModal";
import { ShareButton } from "@/components/share/ShareCard";

// ── Refined option card ───────────────────────────────────────────────────────

function RefinedCard({
  opt,
  thesis,
  animate,
  judgeSummary,
}: {
  opt: RefinedOption;
  thesis: Thesis | null;
  animate: boolean;
  judgeSummary?: string;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const wallet = useWallet();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const pct = `${(opt.confidence * 100).toFixed(0)}%`;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!animate || reduce) {
      bar.style.transition = "none";
      bar.style.width = pct;
      return;
    }
    bar.style.width = "0%";
    const raf = requestAnimationFrame(() => {
      bar.style.width = pct;
    });
    return () => cancelAnimationFrame(raf);
  }, [animate, opt.confidence]);

  // Find the matching ThesisOption to get direction/asset/sizeMUSD.
  const matchingOpt = thesis?.options.find((o) => o.id === opt.optionRef);

  async function handleConfirm(passphrase: string | null): Promise<ExecuteResult> {
    if (!wallet.isUnlocked && passphrase) {
      await wallet.unlock(passphrase);
    }
    if (!thesis) throw new Error("No thesis available");
    if (!matchingOpt) throw new Error(`No matching thesis option for ref "${opt.optionRef}"`);

    const thesisHash = keccak256(stringToHex(thesis.id));
    const verdictHash = keccak256(stringToHex(thesis.id + "|verdict"));

    return wallet.execute(
      {
        direction: matchingOpt.direction,
        asset: matchingOpt.asset,
        sizeMUSD: matchingOpt.sizeMUSD,
        optionRef: opt.optionRef,
        apiBase: "",
      },
      { thesisHash, verdictHash },
    );
  }

  const canExecute = !!matchingOpt && matchingOpt.direction !== "hold" && wallet.isCreated;

  return (
    <>
      <article className={styles.ref}>
        <div className={styles.rtop}>
          <div className={styles.rasset}>
            {matchingOpt ? `${matchingOpt.direction.charAt(0).toUpperCase() + matchingOpt.direction.slice(1)} ${matchingOpt.asset}` : "Option"}
            <small>{opt.optionRef}</small>
          </div>
          <span className={`${styles.riskpill} ${styles[opt.risk]}`}>
            {opt.risk.charAt(0).toUpperCase() + opt.risk.slice(1)}
          </span>
        </div>
        <div className={styles.pct}>
          <span className={styles.pv}>
            {opt.predictedOutputPct >= 0 ? "+" : ""}
            {opt.predictedOutputPct.toFixed(1)}%
          </span>
          <span className={styles.pl}>predicted outcome</span>
        </div>
        <div className={styles.caveats}>
          <div className={styles.cl}>Caveats</div>
          <ul>
            {opt.caveats.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
        <div className={styles.conf}>
          <div className={styles.ch}>
            <span className={styles.ck}>Confidence</span>
            <span className={styles.cv}>{opt.confidence.toFixed(2)}</span>
          </div>
          <div className={styles.track}>
            <div className={styles.bar} ref={barRef} />
          </div>
        </div>

        {/* TradingView live chart for the option's asset */}
        {matchingOpt && (
          <div style={{ marginTop: 14, borderRadius: 10, overflow: "hidden", border: "1px solid var(--line2)" }}>
            <TradingViewChart asset={matchingOpt.asset} height={220} interval="60" />
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button
            className="btn btn-gold"
            type="button"
            disabled={!canExecute}
            title={!wallet.isCreated ? "Create an agent wallet to execute" : !matchingOpt ? "No matching thesis option found" : matchingOpt.direction === "hold" ? "Hold — no trade" : "Execute this option"}
            onClick={() => setModalOpen(true)}
            style={{ flex: 1, justifyContent: "center", marginTop: 0 }}
          >
            <ArrowRightIcon />
            Execute
          </button>
          {matchingOpt && (
            <ShareButton
              label="Share"
              data={{
                intent: thesis?.intent ?? opt.optionRef,
                direction: matchingOpt.direction,
                asset: matchingOpt.asset,
                sizeMUSD: matchingOpt.sizeMUSD,
                predictedReturnLabel: `${opt.predictedOutputPct >= 0 ? "+" : ""}${opt.predictedOutputPct.toFixed(1)}%`,
                risk: opt.risk,
                verdict: judgeSummary
                  ? { summary: judgeSummary, confidence: opt.confidence }
                  : undefined,
              }}
            />
          )}
        </div>
      </article>

      {modalOpen && matchingOpt && (
        <ExecuteModal
          option={{
            id: opt.optionRef,
            direction: matchingOpt.direction,
            asset: matchingOpt.asset,
            sizeMUSD: matchingOpt.sizeMUSD,
            predictedReturnLabel: `${opt.predictedOutputPct >= 0 ? "+" : ""}${opt.predictedOutputPct.toFixed(1)}%`,
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

// ── Judge agent panel ─────────────────────────────────────────────────────────

interface JudgePanel {
  key: "sup" | "dis" | "jud";
  role: string;
  heading: string;
  argument: string;
  traceIndex?: number; // index into result.traces
}

// ── StepJudge ─────────────────────────────────────────────────────────────────

export interface StepJudgeProps {
  /** True when the user first lands on step 2 — drives the bar animation. */
  active: boolean;
  /** The thesis produced by StepThesis. If null, shows a "go back" prompt. */
  thesis: Thesis | null;
}

/**
 * `active` flips true when the user lands on Step 2 — drives the
 * confidence-bar fill animation.
 * `thesis` flows in from the Workspace after StepThesis completes.
 */
export function StepJudge({ active, thesis }: StepJudgeProps) {
  const [result, setResult] = useState<DebateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ran, setRan] = useState(false);
  const [thinking, setThinking] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // Auto-run the debate when thesis becomes available and we're on step 2
  useEffect(() => {
    if (!thesis || ran) return;
    setRan(true);

    // Cancel any previous stream.
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setError(null);
    setThinking("");

    streamSSE(
      "/api/debate/stream",
      { thesis },
      {
        signal: ac.signal,
        onEvent(event, data) {
          if (event === "thinking") {
            const d = data as { delta?: string };
            if (d.delta) setThinking((t) => t + d.delta);
          } else if (event === "result") {
            setResult(data as DebateResult);
          } else if (event === "error") {
            const d = data as { error?: string };
            setError(d.error ?? "Unknown streaming error");
          }
        },
      }
    )
      .catch((e) => {
        if ((e as Error).name !== "AbortError") {
          setError(e instanceof Error ? e.message : "Unknown error");
        }
      })
      .finally(() => setLoading(false));
  }, [thesis, ran]);

  const panels: JudgePanel[] = result
    ? [
        {
          key: "sup",
          role: "Supporter",
          heading: "Argues for",
          argument: result.supporterArgument,
          traceIndex: result.traces?.findIndex((t) => t.role === "supporter") ?? -1,
        },
        {
          key: "dis",
          role: "Discriminator",
          heading: "Argues against",
          argument: result.discriminatorArgument,
          traceIndex: result.traces?.findIndex((t) => t.role === "discriminator") ?? -1,
        },
        {
          key: "jud",
          role: "Judge",
          heading: "Delivers the verdict",
          argument: result.judgeSummary,
          traceIndex: result.traces?.findIndex((t) => t.role === "judge") ?? -1,
        },
      ]
    : [];

  // Best refined option (highest confidence) for the verdict banner
  const bestOption = result
    ? [...result.refinedOptions].sort((a, b) => b.confidence - a.confidence)[0]
    : null;

  return (
    <section className="wrap" id="step-2">
      <div className="reveal">
        <span className="tag">Step two · the tribunal</span>
        <h2 className="h2" style={{ fontSize: "clamp(26px,3.6vw,40px)" }}>
          Your thesis goes on trial.
        </h2>
        <p className="sub">
          Supporter, Discriminator and Judge argue the case, then the Judge
          issues refined options with predicted outcome, risk, caveats and a
          confidence score. Each argument keeps its own reasoning trace.
        </p>
      </div>

      <TribunalFlow className="reveal" />

      {/* No thesis yet — prompt user to go back */}
      {!thesis && (
        <div className={`${styles.notice} reveal`}>
          <WarnIcon />
          Go back to Step one and generate or write a thesis first.
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className={`${styles.notice} reveal`} style={{ borderColor: "var(--gold2)" }}>
          The tribunal is deliberating… this may take ~10 seconds.
        </div>
      )}

      {/* Live streaming thinking panel — visible while deliberating and collapsible after */}
      {(thinking || loading) && (
        <div className="reveal" style={{ marginTop: 16 }}>
          <LiveThinking text={thinking} streaming={loading} />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className={`${styles.notice} reveal`}>
          <WarnIcon />
          {error}
        </div>
      )}

      {/* Judge panels */}
      {result && (
        <>
          <div className={styles.tri}>
            {panels.map((j) => {
              const trace =
                j.traceIndex !== undefined &&
                j.traceIndex >= 0 &&
                result.traces
                  ? result.traces[j.traceIndex]
                  : undefined;
              return (
                <div className={`${styles.agent} ${styles[j.key]} reveal`} key={j.key}>
                  <div className={styles.ic}>
                    <i />
                  </div>
                  <div className={styles.role}>{j.role}</div>
                  <h4>{j.heading}</h4>
                  <p className={styles.arg}>{j.argument}</p>
                  {trace ? (
                    <ThinkingTrace trace={trace} />
                  ) : (
                    <ThinkingTrace
                      summary={`— ${j.role} reasoning`}
                      steps={[{ label: "argument", detail: j.argument }]}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Verdict banner */}
          {bestOption && (
            <div className={`${styles.verdict} reveal`}>
              <div>
                <div className={styles.vk}>Verdict · preferred option</div>
                <h4>{bestOption.optionRef} — confidence {bestOption.confidence.toFixed(2)}</h4>
              </div>
              <div className={styles.spacer} />
              <span className={`${styles.pill} ${styles.pillRet}`}>
                predicted {bestOption.predictedOutputPct >= 0 ? "+" : ""}
                {bestOption.predictedOutputPct.toFixed(1)}%
              </span>
              <span className={`${styles.pill} ${styles.pillRisk}`}>
                risk: {bestOption.risk}
              </span>
              <span className={`${styles.pill} ${styles.pillRisk}`}>
                confidence {bestOption.confidence.toFixed(2)}
              </span>
            </div>
          )}

          {/* Refined options grid */}
          {result.refinedOptions.length > 0 && (
            <>
              <div className={`${styles.opthead} reveal`} style={{ marginTop: 44 }}>
                <h3>Refined options</h3>
                <span className={styles.cnt}>
                  Re-scored by the panel · predicted % · risk · caveats · confidence
                </span>
              </div>
              <div className={styles.refgrid}>
                {result.refinedOptions.map((opt) => (
                  <div className="reveal" key={opt.optionRef}>
                    <RefinedCard
                      opt={opt}
                      thesis={thesis}
                      animate={active}
                      judgeSummary={result.judgeSummary}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <div className={`${styles.notice} reveal`}>
        <WarnIcon />
        Testnet · not financial advice. Executing routes to /trade where your
        agent wallet signs the swap on Mantle — manual confirm.
      </div>
    </section>
  );
}
