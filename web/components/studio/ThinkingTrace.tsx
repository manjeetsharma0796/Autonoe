import { ReasoningTrace } from "../ReasoningTrace";
import type { TraceStep } from "./data";

interface ThinkingTraceProps {
  summary: string;
  steps: TraceStep[];
  role?: string;
}

/**
 * Studio "Show thinking" trace — thin wrapper over the canonical
 * {@link ReasoningTrace} (T-403) so thesis, subagent, and judge traces share
 * one implementation. Kept as a named export for the existing studio imports.
 */
export function ThinkingTrace({ summary, steps, role }: ThinkingTraceProps) {
  return <ReasoningTrace summary={summary} steps={steps} role={role} />;
}
