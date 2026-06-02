# PRD — Autonoe: Autonomous AI Trading Thesis & Debate Copilot

> **Name:** **Autonoe** (Greek _auto_ + _nous_ = "self-mind" / autonomous intelligence). Tagline: _"Your autonomous mind for on-chain trades."_

> **Status:** Approved design · **Date:** 2026-06-02 · **Event:** Mantle "The Turing Test" Hackathon 2026 (Phase 2 — AI Awakening)
> **Submission deadline:** 2026-06-15 15:59 UTC · **Demo Day:** 2026-07-02/03
> **Tracks targeted:** AI Trading & Strategy · Agentic Wallets & Economy · Best UI/UX

---

## 1. One-line summary

An AI trading copilot on **Mantle Sepolia testnet** where a LangChain agent researches the market and produces a **multi-option trading thesis**, optionally stress-tested by a **three-agent debate panel (Supporter → Discriminator → Judge)**, after which an **embedded, exportable agent wallet executes the chosen option as a real on-chain swap**, with every decision and outcome **logged on-chain** as an AI performance benchmark.

## 2. Why (motivation & hackathon fit)

- The hackathon's headline theme is **"on-chain benchmarking of AI — every agent decision and outcome recorded on Mantle."** Our `DecisionLog` contract makes each thesis, verdict, and trade result a permanent, verifiable record.
- **AI Trading & Strategy track:** the thesis agent + debate panel are macro/strategy-driven AI producing executable trades.
- **Agentic Wallets & Economy track:** the agent has its own funded, policy-limited wallet that executes on the user's behalf.
- **Best UI/UX prize:** a polished trading-terminal UI with a visual debate panel and graphed predictions is a direct differentiator.

## 3. Users & core use case

A trader states an intent ("hedge my MNT", "long the dip on ETH"). The system:
1. Generates a researched thesis with several concrete options.
2. Lets the user either execute an option immediately, or send the thesis to the debate panel for a stress-tested, refined recommendation.
3. Executes the chosen option as a real swap from an agent-controlled wallet.
4. Records the decision + outcome on-chain and shows PnL.

## 4. End-to-end flow

```
User intent
   │
   ▼
THESIS AGENT  (single LangChain.js agent orchestrating toggleable subagents)
   ├─ on-chain/DEX subagent      (reserves, price, liquidity from our AMM)
   ├─ market-data/OHLC subagent  (CEX prices/candles)
   ├─ news/sentiment subagent    (macro/narrative summary)
   └─ technical-indicator subagent (RSI/MA computed from OHLC)
   │
   ▼
THESIS = { options[]: { direction, asset, sizeMUSD, rationale, predictedReturnPct {low,high}, risk } }
   │
   ├──► EXECUTE NOW  → user picks an option → agent wallet (or user) signs
   │
   └──► DEBATE PANEL
            Supporter (argues for) → Discriminator (argues against) → Judge (synthesizes)
            │
            ▼
        REFINED OPTIONS = { optionRef, predictedOutputPct, risk, caveats[], confidence }
            │
            ▼
        User selects → agent wallet executes REAL swap on Mantle Sepolia AMM
            │
            ▼
        Outcome → DecisionLog.sol (thesisHash, verdictHash, amounts, pnl) → viewable on mantlescan
```

## 5. Settings — low-friction, per-role model selection

- **Provider registry** (lifted from the `agnostic-chat-models` "Mono" pattern): Groq, Mistral, NVIDIA, Gemini, OpenRouter. Paste an API key once; stored locally, encrypted; proxied server-side to avoid CORS and keep keys off third-party origins.
- **Per-role model dropdown everywhere AI runs:** thesis agent, each subagent (on-chain / market / news / indicators), Supporter, Discriminator, Judge. Models can be mixed across providers per role.
- **Data-source toggle panel:** enable/disable each subagent per analysis run.

## 6. Agent wallet (embedded, exportable)

- A dedicated agent EOA is generated in-browser (viem), encrypted with the user's passphrase, persisted locally (+ optional server backup).
- Funded via faucet/seed (see §8). Signs swaps autonomously **within policy limits** (max trade size, allowlisted tokens).
- **Exportable**: reveal private key / download MetaMask-importable keystore JSON. (EVM equivalent of the requested "PDA wallet with graceful export.")

## 7. Tokens & trading

- **`mUSD` (Mantle USD)** — mintable test stablecoin, nominal $1 peg, **6 decimals**, the **single settlement currency**. All pools are `mUSD/<asset>`.
- Tradable assets: **`WMNT`** (wrapped MNT), **`MockBTC`**, **`MockETH`** (18 decimals).
- Acquisition: **auto-seeded** mUSD balance on wallet creation **and** a one-click **faucet** re-mint.
- All predicted returns and PnL are denominated in mUSD for clean dollar figures.

## 8. On-chain execution & benchmarking

- No production DEX with liquidity is confirmed on Mantle Sepolia (5003); Merchant Moe / Agni / FusionX are mainnet-only. **We deploy our own Uniswap V2 fork** (Factory + Router02) and seed liquidity.
- **MVP pool:** `mUSD/WMNT` (must work for the demo). `mUSD/MockBTC` and `mUSD/MockETH` added only if time allows.
- `DecisionLog.sol` records per trade: `thesisHash`, `verdictHash`, `asset`, `amountIn`, `amountOut`, `pnl`, `optionRef`; emits an event and stores a per-user history. Viewable on mantlescan.

## 9. Network reference (verified, June 2026)

- Chain ID **5003** · native token **MNT**
- RPC: `https://rpc.sepolia.mantle.xyz` (alt `https://5003.rpc.thirdweb.com`)
- Explorers: `https://sepolia.mantlescan.xyz`, `https://explorer.sepolia.mantle.xyz`
- Faucets: `https://faucet.sepolia.mantle.xyz/`, `https://faucets.chain.link/mantle-sepolia`

## 10. Tech stack

- **Unified TypeScript.** React 19 + Vite (UI), wagmi/RainbowKit (external MetaMask connect), viem (agent wallet + swaps).
- **Node/Express** backend: provider proxy + agent orchestration; SQLite kv (Mono pattern) for keys/config/history.
- **LangChain.js** for the thesis agent, subagents, and debate graph.
- **Solidity + Hardhat** for tokens, the Uniswap V2 fork, and `DecisionLog`.

## 11. Architecture — components (each one clear responsibility)

| Dir | Responsibility |
|-----|----------------|
| `contracts/` | Hardhat: `mUSD`, `WMNT`, `MockBTC`, `MockETH`, Uniswap V2 Factory/Router, `DecisionLog`, deploy + seed scripts |
| `packages/chain/` | viem clients, `swapExecutor`, `decisionLog` writer/reader, exported `addresses.json` + ABIs |
| `packages/shared/` | Canonical TypeScript types (Thesis, Option, DebateResult), REST API contract, role enum |
| `server/` | Express: provider proxy (Mono), role/model config, subagents, thesis + debate endpoints |
| `packages/wallet/` | Embedded EOA: generate/encrypt/persist/export, spending-limit policy, agent-sign flow |
| `web/` | React UI: chart, intent+thesis panel, debate visualization, settings, wallet panel, results/history |

## 11a. Information architecture — 6 routes + 1 wallet drawer

> **Names are placeholders (TBD).** Routes shown are working labels; the user will finalize names later.

| # | Route (label TBD) | Owner-ish | Purpose | Key sections |
|---|-------|-----------|---------|--------------|
| 1 | `/` **Landing** | Track D | First impression for judges + submission | Hero, how-it-works (thesis→judge→execute), on-chain-benchmark pitch, "Launch App" CTA, footer |
| 2 | `/markets` **Markets** | Track D | Binance-style markets overview / discovery (see §11g) | Market-stats header, sortable table of all `mUSD/<asset>` pairs (price, 24h %, 24h volume, sparkline), top gainers/losers strip, click-through to `/trade` |
| 3 | `/trade` **Trade** | Track D (lead) | Manual trading + execution surface | Chart panel (TradingView), swap/execute, balances/positions, **side AI rail** (see §11c) |
| 4 | `/studio` **AI Workspace** ⭐ | Track D (lead) | Where theses are created, judged, refined — the signature flow | **Stepped + branchable** (see §11d): Create Thesis (AI **or** human) + pair suggestion → either execute directly or → Judge Panel (Supporter/Discriminator/Judge) → refined options. Every AI output has a **collapsible reasoning trace**. |
| 5 | `/history` **Benchmark** | Track D | On-chain AI-performance showcase | DecisionLog records, PnL over time, win-rate / per-model performance charts, mantlescan links |
| 6 | `/settings` **Settings** | Track D + B | Frictionless config (see §11e) | Provider keys + "get free key" links, per-role model dropdowns (auto-populated), data-source toggles |
| — | **Wallet** (global slide-over drawer, **not** a route) | Track C | Contextual, reachable everywhere | mUSD + asset balances, fund/mint (faucet), export, spending limits |

Wallet is a drawer (not a page) because it's needed in-context while executing on `/trade` and `/studio`.

## 11c. Trade-page side AI rail

A tabbed rail beside the chart so a trader never has to leave the terminal:
- **Quick Thesis** — type an intent → fast thesis + pair suggestion inline, with a "Refine in Judge Panel" button (jumps to `/studio` with the thesis loaded).
- **Assistant** — a conversational AI chat about the market / current position; can spin off a thesis. Uses the configured model for the `assistant` role.

## 11d. AI Workspace flow (stepped + branchable)

```
        ┌─────────────────────────── Step 1: THESIS ───────────────────────────┐
        │  Create with AI   ──or──   Write your own (human-authored)            │
        │  → multi-option thesis (risk-tiered) + pair/asset suggestion          │
        └───────────────┬───────────────────────────────────┬──────────────────┘
                        │ pick an option (choose risk level) │ send thesis to panel
                        ▼                                     ▼
                 EXECUTE on /trade                  Step 2: JUDGE PANEL
                 (skip the panel)                   Supporter → Discriminator → Judge
                                                    → refined options (predicted % + risk + caveats)
                                                                  │
                                                                  ▼
                                                         EXECUTE on /trade
```
- **Two valid paths:** thesis → execute directly, OR thesis → judge → execute. The user chooses per their risk appetite.
- **Human-authored thesis:** Step 1 accepts a user-written thesis as an alternate input, which can then go to the Judge Panel.
- **Collapsible reasoning ("Show thinking"):** every AI output — overall thesis reasoning, each subagent's findings, and each judge's argument — exposes an expandable trace, collapsed by default.

## 11e. Frictionless provider keys

- Per provider (Groq / Mistral / NVIDIA / OpenRouter / Gemini): paste field + **"Get a free key →"** deep link + a one-line free-tier note.
- **Auto-detect models** the instant a key is pasted (live model list) so per-role dropdowns self-populate.
- Keys stored **locally + encrypted, no account required**; proxied server-side so they never touch a third-party origin.
- Inline "pick a model" prompts wherever a role lacks one — no forced trip to Settings first.

## 11b. Design system (Track D builds to this)

Persisted as the source of truth in **`design-system/autonoe/MASTER.md`** (page overrides in `design-system/autonoe/pages/`). Summary:

- **Style:** Dark Mode (OLED), high-contrast, web3-futuristic.
- **Palette:** background `#0F172A`, text `#F8FAFC`, primary/gold `#F59E0B` (markets/trust), secondary `#FBBF24`, CTA/purple `#8B5CF6` (AI/tech).
- **Type:** **Orbitron** (headings) + **Exo 2** (body).
- **Effects:** minimal glow (`text-shadow: 0 0 10px`), smooth 150–300ms transitions, visible focus rings.
- **Non-negotiables:** SVG icons only (Lucide/Heroicons, no emoji), `cursor-pointer` on all interactives, `prefers-reduced-motion` respected, responsive at 375/768/1024/1440, WCAG 4.5:1 contrast.

## 11f. Additional locked features

- **Model performance leaderboard** (on Benchmark): rank which model — per role (`thesis`, `supporter`, `discriminator`, `judge`) — produced the best realized outcomes. Computed from history (each record stores the models used) joined with on-chain PnL. This is the clearest expression of the hackathon's "benchmark AI on-chain" theme.
- **Your-wallet vs agent-wallet clarity**: the UI always visually distinguishes the user's funding wallet (MetaMask) from the autonomous **agent wallet** that holds mUSD and signs swaps — labels, colors, and an explicit "acting wallet" indicator in the drawer and execute flow.
- **Risk disclaimer + share**: a persistent "testnet · not financial advice" notice, plus a one-click **share** of a thesis/verdict card (image/link) for demo flair and social proof.
- **Execution is manual-confirm (MVP):** the agent never auto-executes; the user confirms each trade. (Auto-execute within limits is explicitly deferred.)

## 11g. Markets overview page (`/markets`)

A Binance-style markets/discovery surface (modeled on binance.com/markets/overview), scoped to our testnet assets:
- **Market-stats header:** a few headline figures (number of markets, total mUSD liquidity, biggest 24h mover).
- **Markets table:** one row per `mUSD/<asset>` pair (WMNT, MockBTC, MockETH) with last price (in mUSD), 24h change %, 24h volume, and a **sparkline** mini-chart; sortable columns; a star/favorite toggle.
- **Top gainers / losers strip:** small cards above the table.
- **Click-through:** selecting a row opens `/trade` with that pair preloaded.
- **Data source:** price/24h/volume from the same market subagent feed used by the thesis agent; sparklines from cached OHLC. No new backend contract — reuses existing price data.

Scope note: with only three assets at MVP this is intentionally light; the layout is built to scale if more pairs are added.

## 12. Interface contracts (the parallelization backbone — freeze these first)

These shared shapes let the four tracks build independently against stable interfaces. They live in `packages/shared/types.ts`.

```ts
// Roles that have a configurable model (every place AI runs)
export type AIRole =
  | 'thesis' | 'subagent.onchain' | 'subagent.market'
  | 'subagent.news' | 'subagent.indicators'
  | 'assistant'                                   // Trade-page conversational rail
  | 'supporter' | 'discriminator' | 'judge';

export type ProviderId = 'groq' | 'mistral' | 'nvidia' | 'openrouter' | 'gemini';

export interface ModelChoice { provider: ProviderId; model: string; }
export type RoleModelMap = Record<AIRole, ModelChoice>;

// Collapsible "Show thinking" trace attached to every AI output.
export interface ReasoningTrace {
  role: AIRole;
  summary: string;                  // one-line headline shown collapsed
  steps: { label: string; detail: string }[];   // expanded view
}

export type Direction = 'long' | 'short' | 'hedge' | 'hold';
export type AssetSymbol = 'WMNT' | 'MockBTC' | 'MockETH';

export interface ThesisOption {
  id: string;                       // stable id, e.g. "opt-1"
  direction: Direction;
  asset: AssetSymbol;
  sizeMUSD: number;                 // settlement size in mUSD
  rationale: string;
  predictedReturnPct: { low: number; high: number };
  risk: 'low' | 'medium' | 'high';
}

export interface Thesis {
  id: string;                       // uuid
  intent: string;                   // user's original ask
  source: 'ai' | 'human';           // AI-generated or human-authored
  suggestedPair: AssetSymbol;       // pair/asset suggestion
  activeSources: AIRole[];          // which subagents ran (empty if human)
  options: ThesisOption[];
  reasoning?: string;               // overall thesis reasoning (collapsed by default)
  traces?: ReasoningTrace[];        // per-subagent "show thinking"
  modelsUsed?: Partial<RoleModelMap>; // attribution for the leaderboard
  createdAt: string;                // ISO
}

export interface RefinedOption {
  optionRef: string;                // references ThesisOption.id
  predictedOutputPct: number;
  risk: 'low' | 'medium' | 'high';
  caveats: string[];
  confidence: number;               // 0..1
}

export interface DebateResult {
  thesisId: string;
  supporterArgument: string;
  discriminatorArgument: string;
  judgeSummary: string;
  refinedOptions: RefinedOption[];
  traces?: ReasoningTrace[];        // per-judge "show thinking" (supporter/discriminator/judge)
}

export interface ChatMessage { role: 'user' | 'assistant'; content: string; }

export interface SwapResult {
  txHash: `0x${string}`;
  amountIn: string;                 // base units
  amountOut: string;                // base units
  explorerUrl: string;
}
```

**REST API contract (server/):**

| Method | Path | Body → Response |
|--------|------|-----------------|
| GET | `/api/providers` | → provider registry (label, keysUrl, hasKey) |
| POST | `/api/keys` | `{provider, apiKey}` → `{ok}` (stored encrypted) |
| GET | `/api/models?provider=` | → normalized model list |
| GET/PUT | `/api/roles` | `RoleModelMap` |
| POST | `/api/thesis` | `{intent, activeSources}` → `Thesis` (AI-generated, with `reasoning`/`traces`) |
| POST | `/api/thesis/human` | `{intent, body, suggestedPair}` → `Thesis` (source:'human', structured into options) |
| POST | `/api/debate` | `{thesis: Thesis}` → `DebateResult` (accepts AI- or human-authored thesis; includes per-judge `traces`) |
| POST | `/api/assistant` | `{messages: ChatMessage[], context?}` → streamed `ChatMessage` (Trade-page chat) |
| GET | `/api/history` | → past theses/verdicts/outcomes (from SQLite + DecisionLog; includes models used) |
| GET | `/api/leaderboard` | → realized outcomes aggregated by model + role (for the leaderboard) |

**On-chain artifacts contract:** Track A writes deployed addresses to `packages/chain/addresses.json` and ABIs to `packages/chain/abis/`. All other tracks import from there — never hard-code addresses.

```jsonc
// packages/chain/addresses.json (shape)
{
  "chainId": 5003,
  "mUSD": "0x...", "WMNT": "0x...", "MockBTC": "0x...", "MockETH": "0x...",
  "factory": "0x...", "router": "0x...", "decisionLog": "0x...",
  "pools": { "mUSD_WMNT": "0x...", "mUSD_MockBTC": "0x...", "mUSD_MockETH": "0x..." }
}
```

## 13. Error handling

- Invalid/failed provider key or model → surfaced per-role in the UI, other roles unaffected.
- Swap guards: slippage bound, allowance/approve handled, insufficient balance → faucet prompt.
- LLM/agent timeouts → graceful fallback message, flow not killed.

## 14. Testing strategy

- **Contracts:** Hardhat unit tests for token mint/faucet, addLiquidity, swap math, and `DecisionLog` read/write.
- **Agents:** integration tests against a mock LLM provider so they run without real keys.
- **Wallet:** encryption round-trip, export format, spending-limit enforcement.
- **E2E:** one happy path — intent → thesis → debate → swap → on-chain log — against a local Hardhat fork or live Mantle Sepolia.

## 15. Scope discipline (YAGNI for 13 days)

- Single MVP pair `mUSD/WMNT`; extra asset pools are stretch.
- Charts via **TradingView embed widget** — no custom charting engine.
- **No order book / matching engine.**
- Single-user demo is acceptable.
- First feature to cut under time pressure: the **news/sentiment subagent** (external API dependency) — never the debate panel or the on-chain swap.

## 16. Demo narrative (Demo Day)

1. Connect MetaMask, create the agent wallet (auto-seeded mUSD shown).
2. Type an intent → watch toggled subagents produce a multi-option thesis.
3. Forward to the debate panel → see Supporter/Discriminator/Judge and the refined, risk-graded options with predicted % returns.
4. Pick an option → agent wallet executes a real swap → tx confirms on mantlescan.
5. Open history → the decision + outcome is recorded on-chain (the benchmark).
