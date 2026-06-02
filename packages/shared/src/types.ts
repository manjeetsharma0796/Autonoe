// Canonical domain types for Autonoe. Frozen interface contract — see PRD §12.
// Every track builds against these; change them only by team agreement.

// ── AI roles & providers ─────────────────────────────────────────────────────

/** Every place AI runs and can have its own model assigned. */
export type AIRole =
  | 'thesis'
  | 'subagent.onchain'
  | 'subagent.market'
  | 'subagent.news'
  | 'subagent.indicators'
  | 'assistant' // Trade-page conversational rail
  | 'supporter'
  | 'discriminator'
  | 'judge';

export const AI_ROLES: readonly AIRole[] = [
  'thesis',
  'subagent.onchain',
  'subagent.market',
  'subagent.news',
  'subagent.indicators',
  'assistant',
  'supporter',
  'discriminator',
  'judge',
] as const;

/** Subagent roles that the data-source toggle panel can enable/disable. */
export const SUBAGENT_ROLES = [
  'subagent.onchain',
  'subagent.market',
  'subagent.news',
  'subagent.indicators',
] as const satisfies readonly AIRole[];

export type ProviderId = 'groq' | 'mistral' | 'nvidia' | 'openrouter' | 'gemini';

export const PROVIDER_IDS: readonly ProviderId[] = [
  'groq',
  'mistral',
  'nvidia',
  'openrouter',
  'gemini',
] as const;

export interface ModelChoice {
  provider: ProviderId;
  model: string;
}

/** Which model powers each role. */
export type RoleModelMap = Record<AIRole, ModelChoice>;

// ── Reasoning ("Show thinking") ──────────────────────────────────────────────

/** Collapsible reasoning trace attached to every AI output. */
export interface ReasoningTrace {
  role: AIRole;
  /** One-line headline shown while collapsed. */
  summary: string;
  /** Expanded view. */
  steps: { label: string; detail: string }[];
}

// ── Trading domain ───────────────────────────────────────────────────────────

export type Direction = 'long' | 'short' | 'hedge' | 'hold';
export type AssetSymbol = 'WMNT' | 'MockBTC' | 'MockETH';

export const ASSET_SYMBOLS: readonly AssetSymbol[] = ['WMNT', 'MockBTC', 'MockETH'] as const;

export type RiskLevel = 'low' | 'medium' | 'high';

export interface ThesisOption {
  /** Stable id, e.g. "opt-1". */
  id: string;
  direction: Direction;
  asset: AssetSymbol;
  /** Settlement size, denominated in mUSD. */
  sizeMUSD: number;
  rationale: string;
  predictedReturnPct: { low: number; high: number };
  risk: RiskLevel;
}

export interface Thesis {
  id: string;
  /** The user's original ask. */
  intent: string;
  /** AI-generated or human-authored. */
  source: 'ai' | 'human';
  /** Pair/asset suggestion. */
  suggestedPair: AssetSymbol;
  /** Which subagents ran (empty for human-authored). */
  activeSources: AIRole[];
  options: ThesisOption[];
  /** Overall thesis reasoning (collapsed by default in the UI). */
  reasoning?: string;
  /** Per-subagent "show thinking". */
  traces?: ReasoningTrace[];
  /** Model attribution for the performance leaderboard. */
  modelsUsed?: Partial<RoleModelMap>;
  /** ISO timestamp. */
  createdAt: string;
}

export interface RefinedOption {
  /** References ThesisOption.id. */
  optionRef: string;
  predictedOutputPct: number;
  risk: RiskLevel;
  caveats: string[];
  /** 0..1 */
  confidence: number;
}

export interface DebateResult {
  thesisId: string;
  supporterArgument: string;
  discriminatorArgument: string;
  judgeSummary: string;
  refinedOptions: RefinedOption[];
  /** Per-judge "show thinking" (supporter/discriminator/judge). */
  traces?: ReasoningTrace[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ── Execution ────────────────────────────────────────────────────────────────

export interface SwapResult {
  txHash: `0x${string}`;
  /** Base units (string to avoid precision loss). */
  amountIn: string;
  /** Base units. */
  amountOut: string;
  explorerUrl: string;
}
