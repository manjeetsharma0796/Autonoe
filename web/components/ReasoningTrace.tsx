import styles from "./ReasoningTrace.module.css";

/** One expanded reasoning step. Mirrors `ReasoningTrace.steps[]` (PRD §12). */
export interface TraceStep {
  label: string;
  detail: string;
}

export interface ReasoningTraceProps {
  /** One-line headline shown while collapsed. */
  summary: string;
  /** Expanded timeline. */
  steps: TraceStep[];
  /** Optional role badge (e.g. thesis / supporter / discriminator / judge). */
  role?: string;
  /** Toggle label; defaults to "Show thinking". */
  label?: string;
  /** Render expanded on first paint. */
  defaultOpen?: boolean;
  className?: string;
}

function Chevron() {
  return (
    <svg
      className={styles.chev}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Reusable collapsible "Show thinking" trace (T-403). Pure presentational —
 * native `<details>`, no client JS — so it works in any Server or Client
 * Component. Shown collapsed as `summary`; expands to the `steps[]` timeline.
 * Reused by thesis, subagents, and judges.
 */
export function ReasoningTrace({
  summary,
  steps,
  role,
  label = "Show thinking",
  defaultOpen = false,
  className,
}: ReasoningTraceProps) {
  return (
    <details
      className={className ? `${styles.think} ${className}` : styles.think}
      open={defaultOpen}
    >
      <summary>
        <Chevron />
        <span>{label}</span>
        {role ? <span className={styles.role}>{role}</span> : null}
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
