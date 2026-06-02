import styles from "./studio.module.css";
import { ChevronIcon } from "./icons";
import type { TraceStep } from "./data";

interface ThinkingTraceProps {
  summary: string;
  steps: TraceStep[];
}

/** Collapsible "Show thinking" reasoning trace (native <details>). */
export function ThinkingTrace({ summary, steps }: ThinkingTraceProps) {
  return (
    <details className={styles.think}>
      <summary>
        <ChevronIcon className={styles.chev} />
        <span>Show thinking</span>
        <span className={styles.sumline}>{summary}</span>
      </summary>
      <div className={styles.trace}>
        {steps.map((step, i) => (
          <div className={styles.tstep} key={i}>
            <div className={styles.tl}>{step.label}</div>
            <div className={styles.td}>{step.detail}</div>
          </div>
        ))}
      </div>
    </details>
  );
}
