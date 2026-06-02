# TASKS — Autonoe

Living task tracker for 4 parallel contributors. See [PRD.md](PRD.md) for the full design.
**Last updated:** 2026-06-02 — _(update this line whenever you change a status)_

---

## How to use this file (READ FIRST — applies to every contributor & AI agent)

> **STATUS-UPDATE PROTOCOL — the agent MUST follow this after every task:**
> 1. **Before starting** a task, set its status to `🔄` and put your name in the **Owner** cell.
> 2. **When done** — i.e. all acceptance criteria pass AND the change is committed — set status to `✅`, add the completion date in **Notes**.
> 3. **If blocked**, set status to `⛔` and write what's blocking it in **Notes** (usually a dependency in another track).
> 4. **Always** update the **Last updated** line at the top with today's date.
> 5. **Commit `TASKS.md` together with the code** for that task, e.g. `git commit -m "feat(A2): mUSD token + update TASKS"`.
> 6. **Do not edit another track's task rows** except to mark a dependency you're waiting on. Coordinate in chat for cross-track changes.
> 7. **Never hard-code contract addresses** — import from `packages/chain/addresses.json` (produced by Track A).

**Status legend:** `☐` not started · `🔄` in progress · `✅` done · `⛔` blocked

**Track ownership (assign one person each):**
- **Track A — Contracts & Chain:** _unassigned_
- **Track B — Backend, Proxy & Agents:** _unassigned_
- **Track C — Wallet & Execution:** _unassigned_
- **Track D — Frontend UI:** _unassigned_

**Dependency rule of thumb:** Everyone builds against the **interface contracts in [PRD.md §12](PRD.md)**. That lets all four tracks start immediately after Phase 0 and integrate later. When you need something not yet built, **mock it against the contract** rather than waiting.

---

## Phase 0 — Foundations (do FIRST, together; ~half a day)

These unblock all four tracks. One person can do them while others read the PRD; merge before splitting off.

| ID | Task | Files | Acceptance criteria | Owner | Status | Notes |
|----|------|-------|---------------------|-------|--------|-------|
| 0.1 | Monorepo scaffold | `package.json` (workspaces), `tsconfig.base.json`, `.gitignore`, `.env.example` | `npm install` works at root; workspaces `web`, `server`, `packages/*`, `contracts` resolve | | ☐ | |
| 0.2 | Freeze shared types | `packages/shared/types.ts` | All types from PRD §12 compile and are exported; published as `@aegis/shared` | | ☐ | |
| 0.3 | Freeze REST API contract | `packages/shared/api.ts` (route consts + req/res types) | Every endpoint in PRD §12 has a typed request/response | | ☐ | |
| 0.4 | Env + network config | `.env.example`, `packages/chain/network.ts` | Chain 5003 RPC + explorer constants exported; `.env.example` lists all keys (provider keys, deployer key) | | ☐ | |

---

## Track A — Smart Contracts & Chain

Builds the on-chain layer and the viem library other tracks call. Independent of B/C/D after Phase 0.

| ID | Task | Files | Acceptance criteria | Owner | Status | Notes |
|----|------|-------|---------------------|-------|--------|-------|
| A1 | Hardhat project + Mantle Sepolia config | `contracts/hardhat.config.ts`, `contracts/package.json` | `npx hardhat compile` passes; network `mantleSepolia` (5003) configured from env deployer key | | ☐ | |
| A2 | `mUSD` stablecoin | `contracts/contracts/mUSD.sol`, `contracts/test/mUSD.test.ts` | ERC-20, 6 decimals; `faucet()` mints fixed amount with per-address cooldown + cap; `ownerMint()` for seeding; tests pass | | ☐ | |
| A3 | Asset tokens | `contracts/contracts/{WMNT,MockBTC,MockETH}.sol`, tests | WMNT = WETH-style wrapper (deposit/withdraw); BTC/ETH = 18-dec mintable ERC-20; tests pass | | ☐ | |
| A4 | Uniswap V2 fork | `contracts/contracts/v2/*` (Factory, Router02), test | Canonical Uniswap V2 core+periphery compiled with WMNT as WETH; `createPair` + quote works in test | | ☐ | depends A3 |
| A5 | `DecisionLog` contract | `contracts/contracts/DecisionLog.sol`, test | `logDecision(thesisHash, verdictHash, asset, amountIn, amountOut, pnl, optionRef)` emits event + stores per-user; getters; tests pass | | ☐ | |
| A6 | Deploy + seed script | `contracts/scripts/deploy.ts` | Deploys all tokens, factory, router, DecisionLog; creates `mUSD/WMNT` pair; seeds liquidity; prints addresses | | ☐ | depends A2–A5 |
| A7 | Export addresses + ABIs | `packages/chain/addresses.json`, `packages/chain/abis/*.json` | Live Mantle Sepolia addresses + ABIs committed; verified on mantlescan | | ☐ | depends A6 |
| A8 | viem chain library | `packages/chain/clients.ts`, `swapExecutor.ts`, `decisionLog.ts`, tests | `getQuote()`, `swap()` (approve + `swapExactTokensForTokens` + slippage), `writeDecision()`, `readHistory()`; integration test does a real swap on testnet | | ☐ | depends A7 |
| A9 | (Stretch) extra pools | `contracts/scripts/seedExtra.ts` | `mUSD/MockBTC`, `mUSD/MockETH` pairs created + seeded | | ☐ | stretch |

---

## Track B — Backend, Provider Proxy & AI Agents

Node/Express + LangChain.js. Can mock Track A's chain lib via PRD §12 until A8 lands.

| ID | Task | Files | Acceptance criteria | Owner | Status | Notes |
|----|------|-------|---------------------|-------|--------|-------|
| B1 | Server scaffold + SQLite kv | `server/index.ts`, `server/store.ts` | Express boots; SQLite kv (Mono pattern) with get/set/del; serves `web/` build | | ☐ | |
| B2 | Provider proxy (Mono port) | `server/providers.ts`, `server/routes/providers.ts` | `GET /api/providers`, `POST /api/keys` (encrypted at rest), `GET /api/models`, chat proxy for Groq/Mistral/NVIDIA/Gemini/OpenRouter | | ☐ | depends B1 |
| B3 | Role→model config API | `server/routes/roles.ts` | `GET/PUT /api/roles` persists a `RoleModelMap`; defaults provided | | ☐ | depends B1, 0.2 |
| B4 | Data subagents (tools) | `server/agents/subagents/{onchain,market,news,indicators}.ts` | Each is a callable tool returning structured data; each gated by `activeSources`; onchain reads via chain lib (mock until A8) | | ☐ | depends 0.2 |
| B5 | Thesis agent (+ human thesis) | `server/agents/thesis.ts`, `server/routes/thesis.ts` | `POST /api/thesis` → valid `Thesis` (PRD §12) using the role's model, orchestrating only active subagents; **populates `reasoning` + per-subagent `traces`**; `POST /api/thesis/human` structures a user-written thesis (source:'human') into options | | ☐ | depends B2–B4 |
| B6 | Debate graph | `server/agents/debate.ts`, `server/routes/debate.ts` | `POST /api/debate` → `DebateResult` (accepts AI **or** human thesis); Supporter→Discriminator→Judge each use their configured model; returns refined options w/ predicted % + risk + caveats **plus per-judge `traces`** | | ☐ | depends B2,B3 |
| B7 | History endpoint | `server/routes/history.ts` | `GET /api/history` merges SQLite records + on-chain DecisionLog (via chain lib) | | ☐ | depends A8,B1 |
| B8 | Assistant chat endpoint | `server/agents/assistant.ts`, `server/routes/assistant.ts` | `POST /api/assistant` streams a `ChatMessage` reply using the `assistant` role's model; optional market/position context; can emit a thesis | | ☐ | depends B2,B3 |

---

## Track C — Wallet & Execution UX

In-browser embedded wallet with viem. Builds against chain lib interface; mock `swap()` until A8.

| ID | Task | Files | Acceptance criteria | Owner | Status | Notes |
|----|------|-------|---------------------|-------|--------|-------|
| C1 | Wallet generate + encrypt + persist | `packages/wallet/wallet.ts`, tests | Generates EOA (viem); encrypts key with passphrase (WebCrypto); persists in IndexedDB; unlock round-trip test passes | | ☐ | depends 0.1 |
| C2 | Export wallet | `packages/wallet/export.ts`, tests | Reveal private key + download MetaMask-importable keystore JSON; re-import verified | | ☐ | depends C1 |
| C3 | Spending-limit policy | `packages/wallet/policy.ts`, tests | Enforces max trade size + token allowlist before signing; rejects over-limit with clear error | | ☐ | depends C1 |
| C4 | Agent-sign + execute | `packages/wallet/execute.ts` | Given a chosen option, builds + signs + submits swap via chain lib; returns `SwapResult`; triggers DecisionLog write | | ☐ | depends C1,C3,A8 |
| C5 | Funding helpers | `packages/wallet/funding.ts` | Auto-seed mUSD on creation + faucet re-mint call; native MNT faucet link surfaced | | ☐ | depends A7 |

---

## Track D — Frontend UI (Best UI/UX target)

React 19 + Vite. **5 routes + 1 wallet drawer** (PRD §11a–§11e; route names TBD). Renders against PRD §12 types; mock API responses until server endpoints land.
**Build to the design system in `design-system/autonoe/MASTER.md`** (page overrides in `design-system/autonoe/pages/`). Use the `frontend-design` skill for polish and `web3-vfx-stack` for the landing visual wow. Dark OLED · gold `#F59E0B` + purple `#8B5CF6` on `#0F172A` · Orbitron/Exo 2.

| ID | Task | Files | Acceptance criteria | Owner | Status | Notes |
|----|------|-------|---------------------|-------|--------|-------|
| D1 | App scaffold + routing + theme | `web/` (Vite+React+Router), `web/src/App.tsx`, `web/src/theme.css`, wagmi/RainbowKit | App runs; 5 routes wired (`/`,`/trade`,`/studio`,`/history`,`/settings`); design tokens applied; MetaMask connect on Mantle Sepolia | | ☐ | depends 0.1 |
| D2 | Global shell + wallet drawer | `web/src/components/{AppShell,WalletDrawer}.tsx` | Persistent nav + global slide-over wallet drawer reachable from every route; balances/fund/export/limits (calls `packages/wallet`) | | ☐ | depends D1, C-track |
| D3 | **ReasoningTrace component** (shared "Show thinking") | `web/src/components/ReasoningTrace.tsx` | Reusable collapsible trace: shows `summary` collapsed, expands to `steps[]` (PRD §12 `ReasoningTrace`); used by thesis, subagents, and judges | | ☐ | depends D1,0.2 |
| D4 | `/` Landing page | `web/src/pages/Landing.tsx` | Hero + how-it-works (thesis→judge→execute) + on-chain-benchmark pitch + "Launch App" CTA; passes design review | | ☐ | depends D1 |
| D5 | `/trade` chart + execute | `web/src/pages/Trade.tsx`, `web/src/components/{ChartPanel,SwapBox,Positions}.tsx` | TradingView embed for selected pair; manual swap/execute via `packages/wallet`; balances/positions | | ☐ | depends D1,C4 |
| D6 | `/trade` side AI rail | `web/src/components/{AIRail,QuickThesis,AssistantChat}.tsx` | Tabbed rail: Quick Thesis (intent→inline thesis + "Refine in Judge Panel" → `/studio`) and Assistant chat (`/api/assistant`); reasoning traces shown | | ☐ | depends D5,D3,B5,B8 |
| D7 | `/studio` Step 1 — Thesis (AI or human) | `web/src/pages/Studio.tsx`, `web/src/components/{IntentBar,SourceToggles,HumanThesisEditor,ThesisOptions}.tsx` | AI mode fires `POST /api/thesis`; human mode posts `/api/thesis/human`; renders risk-tiered option cards + pair suggestion + thesis reasoning trace; per-option branch buttons "Execute" / "Send to Judge Panel" | | ☐ | depends D1,D3,0.2 |
| D8 | `/studio` Step 2 — Judge Panel | `web/src/components/DebatePanel.tsx` | Supporter/Discriminator/Judge arguments (each with reasoning trace), verdict, refined options with predicted % + risk + caveats graphed; "Execute" per option | | ☐ | depends D7,D3 |
| D9 | Execute flow (shared) | `web/src/components/ExecuteModal.tsx` | From a chosen option (direct from thesis OR from judge) → confirm → tx status + PnL + mantlescan link (calls `packages/wallet` execute) | | ☐ | depends D7,D8,C4 |
| D10 | `/settings` page | `web/src/pages/Settings.tsx` | Per-provider paste field + "Get free key" link + free-tier note; **auto-populate models on paste**; per-role model dropdowns (incl. `assistant`); data-source toggles; persists via `/api/keys`,`/api/roles` | | ☐ | depends D1,0.3 |
| D11 | `/history` Benchmark page | `web/src/pages/History.tsx` | DecisionLog records + PnL-over-time / win-rate charts + mantlescan links; reads `/api/history` | | ☐ | depends D1,B7 |

---

## Integration phase (after tracks converge)

| ID | Task | Acceptance criteria | Owner | Status | Notes |
|----|------|---------------------|-------|--------|-------|
| I1 | Wire UI ↔ server (real endpoints) | Thesis + debate render from live API, no mocks | | ☐ | |
| I2 | Wire wallet ↔ chain lib (real swap) | A real `mUSD/WMNT` swap executes from the agent wallet on testnet | | ☐ | |
| I3 | On-chain logging live | Each executed option writes to DecisionLog; history shows the on-chain record | | ☐ | |
| I4 | E2E happy path | intent → thesis → debate → swap → on-chain log passes end-to-end | | ☐ | |
| I5 | Demo polish + script | UI passes a design review; demo narrative (PRD §16) rehearsed; mantlescan links work | | ☐ | |

---

## Suggested ownership for 4 contributors

- **Person 1 → Track A** (Solidity/viem) — the critical path; start immediately.
- **Person 2 → Track B** (backend + LangChain agents).
- **Person 3 → Track C + wallet UX glue** (wallet) — pairs with Person 4 on D2 (wallet drawer) and D10 (settings).
- **Person 4 → Track D** (frontend/UX) — owns the Best UI/UX target.
- Everyone does **Phase 0 together first**, then splits. Integration phase is shared.
