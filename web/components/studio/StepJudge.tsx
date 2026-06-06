"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type {
  AssetSymbol,
  DebateResult,
  RefinedOption,
  RiskLevel,
  Thesis,
  ThesisOption,
} from "@autonoe/shared";
import styles from "./studio.module.css";
import { ExecuteDialog } from "../execute/ExecuteDialog";
import { ThinkingTrace } from "./ThinkingTrace";
import { TribunalFlow } from "./TribunalFlow";
import { ShareButton } from "../share/ShareCard";
import { PredictionChart, type Prediction } from "../trade/PredictionChart";
import { ApiError, runDebate } from "@/lib/api";
import { bandLabel, dirLabel, signed, titleCase } from "./format";
import { ArrowRightIcon, WarnIcon } from "./icons";

interface DisplayRefined {
  id: string;
  title: string;
  sub: string;
  risk: RiskLevel;
  riskLabel: string;
  predicted: string;
  caveats: string[];
  confidence: number;
}

function toDisplay(opt: RefinedOption, thesis: Thesis | null): DisplayRefined {
  const ref = thesis?.options.find((o) => o.id === opt.optionRef);
  const title = ref ? `${dirLabel(ref.direction)} ${ref.asset}` : "Refined option";
  return {
    id: opt.optionRef,
    title,
    sub: opt.optionRef,
    risk: opt.risk,
    riskLabel: titleCase(opt.risk),
    predicted: signed(opt.predictedOutputPct),
    caveats: opt.caveats,
    confidence: opt.confidence,
  };
}

function RefinedCard({
  opt,
  animate,
  resolvedOption,
  thesis,
  debate,
}: {
  opt: DisplayRefined;
  animate: boolean;
  /** The underlying ThesisOption resolved from thesis.options by optionRef. */
  resolvedOption: ThesisOption | undefined;
  thesis: Thesis;
  debate: DebateResult;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [executing, setExecuting] = useState(false);

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

  return (
    <>
      <article className={styles.ref}>
        <div className={styles.rtop}>
          <div className={styles.rasset}>
            {opt.title}
            <small>{opt.sub}</small>
          </div>
          <span className={`${styles.riskpill} ${styles[opt.risk]}`}>
            {opt.riskLabel}
          </span>
        </div>
        <div className={styles.pct}>
          <span className={styles.pv}>{opt.predicted}</span>
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
        <button
          className="btn btn-gold"
          type="button"
          disabled={!resolvedOption}
          onClick={() => setExecuting(true)}
        >
          <ArrowRightIcon />
          Execute
        </button>
      </article>

      {executing && resolvedOption && (
        <ExecuteDialog
          option={resolvedOption}
          thesis={thesis}
          verdict={debate}
          optionRef={opt.id}
          onClose={() => setExecuting(false)}
        />
      )}
    </>
  );
}

const JUDGE_VIEW = [
  { key: "sup", role: "Supporter", heading: "Argues for", traceRole: "supporter" },
  { key: "dis", role: "Discriminator", heading: "Argues against", traceRole: "discriminator" },
  { key: "jud", role: "Judge", heading: "Delivers the verdict", traceRole: "judge" },
] as const;

/** `active` flips true when the user lands on Step 2 with a thesis ready —
 *  triggers the debate fetch and the confidence-bar fill animation. */
export function StepJudge({
  thesis,
  active,
}: {
  thesis: Thesis | null;
  active: boolean;
}) {
  const [debate, setDebate] = useState<DebateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!active || !thesis) return;
    if (fetchedFor.current === thesis.id) return;
    fetchedFor.current = thesis.id;

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setDebate(null);

    runDebate(thesis, controller.signal)
      .then((d) => setDebate(d))
      .catch((e) => {
        if (controller.signal.aborted) return;
        fetchedFor.current = null; // allow retry on next visit
        setError(
          e instanceof ApiError ? e.message : "The tribunal could not deliberate.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [active, thesis]);

  const arguments_ = debate
    ? {
        supporter: debate.supporterArgument,
        discriminator: debate.discriminatorArgument,
        judge: debate.judgeSummary,
      }
    : null;

  const refined = debate ? debate.refinedOptions.map((o) => toDisplay(o, thesis)) : [];
  const top = debate?.refinedOptions
    .slice()
    .sort((a, b) => b.confidence - a.confidence)[0];
  const topRef = top ? thesis?.options.find((o) => o.id === top.optionRef) : undefined;

  const verdictTitle = top
    ? topRef
      ? `${dirLabel(topRef.direction)} ${topRef.asset}`
      : "Preferred option"
    : null;

  const prediction: Prediction | null =
    top && topRef
      ? {
          direction: topRef.direction === "short" ? "short" : "long",
          lowPct: topRef.predictedReturnPct.low,
          highPct: topRef.predictedReturnPct.high,
          label: "preferred",
        }
      : null;
  const chartAsset: AssetSymbol = topRef?.asset ?? thesis?.suggestedPair ?? "WMNT";

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

      {!thesis && (
        <div className={`${styles.notice} reveal`}>
          <WarnIcon />
          Generate a thesis in Step 1, then send it here to put it on trial.
        </div>
      )}

      {thesis && loading && (
        <div className={`${styles.notice} reveal`}>
          <WarnIcon />
          The tribunal is deliberating over “{thesis.intent}”…
        </div>
      )}

      {thesis && error && (
        <div className={`${styles.notice} reveal`}>
          <WarnIcon />
          {error} —{" "}
          <Link href="/settings" style={{ color: "var(--gold2)" }}>
            check your provider keys in Settings
          </Link>
          .
        </div>
      )}

      {debate && arguments_ && (
        <>
          <TribunalFlow className="reveal" />

          <div className={styles.tri}>
            {JUDGE_VIEW.map((j) => {
              const trace = debate.traces?.find((t) => t.role === j.traceRole);
              return (
                <div className={`${styles.agent} ${styles[j.key]} reveal`} key={j.key}>
                  <div className={styles.ic}>
                    <i />
                  </div>
                  <div className={styles.role}>{j.role}</div>
                  <h4>{j.heading}</h4>
                  <p className={styles.arg}>{arguments_[j.traceRole]}</p>
                  {trace && (
                    <ThinkingTrace summary={trace.summary} steps={trace.steps} />
                  )}
                </div>
              );
            })}
          </div>

          {verdictTitle && top && (
            <div className={`${styles.verdict} reveal`}>
              <div>
                <div className={styles.vk}>Verdict · preferred option</div>
                <h4>{verdictTitle}</h4>
              </div>
              <div className={styles.spacer} />
              <span className={`${styles.pill} ${styles.pillRet}`}>
                predicted {signed(top.predictedOutputPct)}
              </span>
              <span className={`${styles.pill} ${styles.pillRisk}`}>
                risk: {top.risk}
              </span>
              <span className={`${styles.pill} ${styles.pillRisk}`}>
                confidence {top.confidence.toFixed(2)}
              </span>
              <ShareButton
                data={{
                  kind: "verdict",
                  title: verdictTitle,
                  subtitle: `Judge Panel verdict · preferred option · mUSD/${chartAsset}`,
                  stats: [
                    { label: "predicted", value: signed(top.predictedOutputPct) },
                    { label: "risk", value: top.risk },
                    { label: "confidence", value: top.confidence.toFixed(2) },
                  ],
                }}
              />
            </div>
          )}

          {prediction && (
            <div
              className="reveal"
              style={{
                marginTop: 24,
                padding: 16,
                border: "1px solid var(--line)",
                borderRadius: 14,
                background: "rgba(255,255,255,0.015)",
              }}
            >
              <PredictionChart
                asset={chartAsset}
                interval="240"
                prediction={prediction}
                height={300}
              />
            </div>
          )}

          <div className={`${styles.opthead} reveal`} style={{ marginTop: 44 }}>
            <h3>Refined options</h3>
            <span className={styles.cnt}>
              Re-scored by the panel · predicted % · risk · caveats · confidence
            </span>
          </div>
          <div className={styles.refgrid}>
            {refined.map((opt) => (
              <div className="reveal" key={opt.id}>
                <RefinedCard
                  opt={opt}
                  animate={active}
                  resolvedOption={thesis?.options.find((o) => o.id === opt.id)}
                  thesis={thesis!}
                  debate={debate}
                />
              </div>
            ))}
          </div>
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
