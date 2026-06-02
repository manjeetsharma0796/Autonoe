import { useState } from "react";
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
  THESIS_OPTIONS,
  THESIS_TRACE,
  type DataSourceKey,
  type ThesisOption,
} from "./data";

type Mode = "ai" | "human";

const SOURCE_ICON: Record<DataSourceKey, typeof OnChainIcon> = {
  onchain: OnChainIcon,
  market: MarketIcon,
  indicators: IndicatorsIcon,
  news: NewsIcon,
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
          <TrendUpIcon /> {opt.directionLabel}
        </span>
        <span className={`${styles.riskpill} ${styles[opt.risk]}`}>
          {opt.risk} risk
        </span>
      </div>
      <div className={styles.asset}>{opt.asset}</div>
      <div className={styles.size}>
        Size <b>{opt.sizeValue}</b> · {opt.sizeLabel}
      </div>
      <p className={styles.rat}>{opt.rationale}</p>
      <div className={styles.ret}>
        <span className={styles.rk}>Predicted</span>
        <span className={styles.rv}>{opt.predicted}</span>
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

export function StepThesis({ onSendToJudge }: { onSendToJudge: () => void }) {
  const [intent, setIntent] = useState(DEFAULT_INTENT);
  const [humanCase, setHumanCase] = useState(DEFAULT_HUMAN_CASE);
  const [mode, setMode] = useState<Mode>("ai");
  const [sources, setSources] =
    useState<Record<DataSourceKey, boolean>>(DEFAULT_SOURCES);

  const toggleSource = (key: DataSourceKey) =>
    setSources((s) => ({ ...s, [key]: !s[key] }));

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
                <button className="btn btn-gold" type="button">
                  <SparkSingleIcon />
                  Generate thesis
                </button>
                <span className={styles.hint}>
                  <ClockIcon />3 subagents active · ~5s to multi-option thesis
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
              <div className={styles.runrow}>
                <button className="btn btn-gold" type="button">
                  <ArrowRightIcon />
                  Structure into options
                </button>
                <span className={styles.hint}>
                  <PenIcon />
                  Human-authored · source tagged for the leaderboard
                </span>
              </div>
            </div>
          )}
        </div>

        <ThinkingTrace
          summary="— Oversold reclaim setup confirmed by 3 of 3 enabled sources"
          steps={THESIS_TRACE}
        />
      </div>

      <div className={`${styles.opthead} reveal`}>
        <h3>Thesis options</h3>
        <span className={styles.cnt}>
          3 risk-tiered candidates · suggested pair mUSD/WMNT
        </span>
      </div>
      <div className={styles.optgrid}>
        {THESIS_OPTIONS.map((opt) => (
          <div className="reveal" key={opt.id}>
            <ThesisOptionCard opt={opt} onSendToJudge={onSendToJudge} />
          </div>
        ))}
      </div>

      <div className={`${styles.notice} reveal`}>
        <WarnIcon />
        Testnet · not financial advice. The agent never auto-executes — you
        confirm every trade.
      </div>
    </section>
  );
}
