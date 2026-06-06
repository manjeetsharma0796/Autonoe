---
title: Autonoe team task board
purpose: Shared async task tracker for the 4-person team — humans and their Claude agents
last_updated: 2026-06-05
---

# TODO

Single source of truth for what's in flight on **Autonoe** (see [PRD.md](PRD.md)). Anyone — human or Claude agent — can pick pending tasks, add new ones, or release stale ones.

## How to use this file (90-second version)

1. **Find a pickable task** — `Status: pending` AND every entry in `Depends-on` is `done`.
2. **Claim** — change `Status: pending` → `Status: in-progress @your-handle YYYY-MM-DD`. Commit *only that line* on a branch `claim/T-XXX-<slug>`, push, open a PR titled `claim: T-XXX`. **Merging that claim PR is the lock** (we don't run auto-merge — merge it yourself once CI is green; it's a one-line diff).
3. **Work** — branch from `main` into `feat/T-XXX-<slug>` (or `fix/`, `docs/`). Reference `T-XXX` in every commit and the implementation PR title.
4. **Finish** — the same PR that merges the work flips the line to `Status: done @your-handle YYYY-MM-DD` and moves the task block to the **Done** section at the bottom.
5. **Stuck** — change to `Status: blocked — <one-line reason>` and ping the Telegram channel. Keep the entry; don't delete it.
6. **Add a task** — append a block under the right section using the next free ID. State `Acceptance` clearly so anyone can pick it up cold.
7. **Drop a claim** — flip back to `Status: pending`. PR title `unclaim: T-XXX`.

### Stale-claim rule

If a task is `in-progress` for **more than 5 days with zero commits referencing its ID**, anyone may revert it to `pending` and re-claim. Add a `Reverted: <date> by @you — reason` line for the paper trail. You may also `override:` a claim earlier with concrete reason (conflict / blocking your work).

### Solo / no-review fast path

Working alone with no reviewer? Edit `TODO.md` directly on `main`, push (the push is the lock), then start the implementation branch. Don't skip the visible status change — teammates watch the Telegram feed.

## Conventions

| Thing | Convention |
|---|---|
| Branch | `feat/T-XXX-<slug>` / `fix/T-XXX-<slug>` / `docs/T-XXX-<slug>` / `claim/T-XXX-<slug>` |
| Commit | `T-XXX: <verb> <object>` (e.g. `T-102: add mUSD faucet with cooldown`) |
| PR title | `T-XXX — <task title>` (claim/unclaim/override PRs use the `claim:`/`unclaim:`/`override:` prefix) |
| PR body | Link the TODO line; check off Acceptance criteria |
| Scope per PR | One task = one PR. If it balloons, stop and split — the new thing gets its own T-XXX |
| Package manager | **bun** only (`bun install`, `bun --filter '*' test`). Never npm/yarn/pnpm |
| Network | All on-chain work targets **Mantle Sepolia (chain 5003)** |

## Team

> **Team channel:** Telegram group (bot token + chat id live as repo secrets `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`). Notification workflow: [`.github/workflows/telegram-notify.yml`](.github/workflows/telegram-notify.yml) — posts on PR open / conflict / merge / push to main, plus a "today's tally" leaderboard. CI: [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

| Handle | OS | Preferred area | Status |
|---|---|---|---|
| `@prithwish` | Linux | Contracts & chain (Track 1) | active |
| `@____` | TBD | Backend + agents (Track 2) | fill before first claim |
| `@____` | TBD | Wallet + execution (Track 3) | fill before first claim |
| `@jishnu` | Windows | Frontend UI (Track 4) + integration | active |

## Active claims

`grep "Status: in-progress" TODO.md` to see who's on what.

## Sections

0. [Foundations](#0--foundations) — `T-0xx` — monorepo, shared contracts (done)
1. [Contracts & Chain](#1--contracts--chain) — `T-1xx` — Solidity/Hardhat + viem
2. [Backend, Proxy & Agents](#2--backend-proxy--agents) — `T-2xx` — Express, provider proxy, LangChain.js
3. [Wallet & Execution](#3--wallet--execution) — `T-3xx` — embedded EOA, swaps
4. [Frontend UI](#4--frontend-ui) — `T-4xx` — 5 routes + wallet drawer
5. [Infra / DevOps / Docs](#5--infra--devops--docs) — `T-5xx`
6. [Integration & Demo](#6--integration--demo) — `T-6xx`
7. [Done](#done)
8. [Blocked](#blocked)

### Status legend
- `pending` — anyone with deps cleared can pick
- `in-progress @handle YYYY-MM-DD` — locked
- `review` — implementation PR open, awaiting review
- `blocked — <reason>` — stuck
- `done @handle YYYY-MM-DD` — completed; move block to Done

> **Interface contracts are frozen in [PRD.md §12](PRD.md).** Build against them and mock what isn't ready, so all four tracks run in parallel.

---

## 0 — Foundations

_(All done — the shared base every track builds on.)_

---

## 1 — Contracts & Chain

> Solidity/Hardhat + the viem library other tracks call. Independent of tracks 2–4 after Foundations.

_(all done — see Done section)_

---

## 2 — Backend, Proxy & Agents

> Node/Express + LangChain.js. Mock the chain lib (PRD §12) until T-108 lands.

### T-201 — Server scaffold + SQLite kv
- Status: done @Claude 2026-06-03 — Express app + bun:sqlite kv (`server/src/{app,index,store}.ts`); boots on :8787. Static `web/` serving deferred until the web build exists.
- Depends-on: —
- Scope: api
- Acceptance: `server/` boots Express; SQLite kv (Mono pattern) with get/set/del; serves the `web/` build. Add `server` to root `workspaces`.

### T-202 — Provider proxy (Mono port)
- Status: done @Claude 2026-06-03 — registry + `/api/providers`, `/api/keys` (AES-GCM at rest), `/api/models` for all 5 providers; LangChain model factory (`server/src/{providers,models,crypto}.ts`). AI calls route through providers via the factory rather than a raw chat passthrough.
- Depends-on: T-201
- Scope: api
- Acceptance: `GET /api/providers`, `POST /api/keys` (encrypted at rest), `GET /api/models`, chat proxy for Groq / Mistral / NVIDIA / Gemini / OpenRouter.

### T-203 — Role→model config API
- Status: done @Claude 2026-06-03 — `GET/PUT /api/roles` with sensible defaults merged over stored map (`server/src/roles.ts`).
- Depends-on: T-201
- Scope: api
- Acceptance: `GET/PUT /api/roles` persists a `RoleModelMap` (PRD §12) with sensible defaults.

### T-204 — Data subagents (now real LangChain tools)
- Status: done @Claude 2026-06-03 — real tools in `server/src/agents/tools.ts` over **Bybit v5 public market data** (`server/src/market/bybit.ts`, no key) + **computed indicators** RSI/SMA/EMA/MACD (`server/src/market/indicators.ts`), gated by the active-source allow-list, each recording a reasoning trace. WMNT analysis maps to Bybit `MNTUSDT`; the on-chain tool stays placeholder pending T-108; news/web-search deferred (T-209).
- Depends-on: —
- Scope: api
- Acceptance: `server/agents/subagents/{onchain,market,news,indicators}.ts` — each a callable tool returning structured data, gated by `activeSources`; onchain reads via the chain lib (mock until T-108).

### T-205 — Thesis agent (+ human thesis)
- Status: done @Claude 2026-06-03 — **tool-calling loop**: the model picks Bybit/indicator/on-chain tools per intent, then a structured finalize emits a zod-validated thesis (`server/src/agents/thesis.ts`). `/api/thesis` + `/api/thesis/human`; tools actually called become the reasoning traces. Injectable resolver + fetcher → unit-tested with a fake model + fixture candles.
- Depends-on: T-202, T-203, T-204
- Scope: api
- Acceptance: `POST /api/thesis` → valid `Thesis` using the `thesis` role's model, orchestrating only active subagents, populating `reasoning` + per-subagent `traces`. `POST /api/thesis/human` structures a user-written thesis (source `human`) into options.

### T-206 — Debate graph
- Status: done @Claude 2026-06-03 — Supporter → Discriminator → Judge, each on its own model; `/api/debate` returns refined options + per-judge traces (`server/src/agents/debate.ts`). Accepts AI or human thesis.
- Depends-on: T-202, T-203
- Scope: api
- Acceptance: `POST /api/debate` → `DebateResult` (accepts AI or human thesis); Supporter → Discriminator → Judge each use their configured model; returns refined options (predicted % + risk + caveats) plus per-judge `traces`.

### T-207 — History + leaderboard endpoints
- Status: in-progress @jishnu 2026-06-06
- Depends-on: T-108, T-201
- Scope: api
- Acceptance: `GET /api/history` merges SQLite records + on-chain DecisionLog, storing models used per role; `GET /api/leaderboard` aggregates realized outcomes by model + role.

### T-208 — Assistant chat endpoint
- Status: done @Claude 2026-06-03 — `/api/assistant` replies via the assistant-role model (`server/src/agents/assistant.ts`). Returns a full message; streaming can be added later.
- Depends-on: T-202, T-203
- Scope: api
- Acceptance: `POST /api/assistant` replies via the assistant-role model with optional market/position context; can spin off a thesis.

---

## 3 — Wallet & Execution

> In-browser embedded wallet (viem). Build against the chain-lib interface; mock `swap()` until T-108.

### T-301 — Wallet generate + encrypt + persist
- Status: done @Claude 2026-06-03 — `@autonoe/wallet`: viem EOA + WebCrypto PBKDF2/AES-GCM keystore, injectable `WalletStore` + `memoryStore()` (`packages/wallet/src/wallet.ts`). 14 tests pass.
- Depends-on: —
- Scope: wallet
- Acceptance: `packages/wallet/src/wallet.ts` generates an EOA (viem), encrypts the key with a passphrase (WebCrypto), persists in IndexedDB; unlock round-trip test passes. Add `packages/wallet` to root `workspaces`.

### T-302 — Export wallet
- Status: done @Claude 2026-06-03 — `exportPrivateKey` + `exportKeystoreJSON` (`packages/wallet/src/export.ts`); tested (no plaintext key in keystore JSON). MetaMask-import polish later.
- Depends-on: T-301
- Scope: wallet
- Acceptance: reveal private key + download a MetaMask-importable keystore JSON; re-import verified in a test.

### T-303 — Spending-limit policy
- Status: done @Claude 2026-06-03 — `SpendingPolicy` + `checkPolicy`/`enforcePolicy` + persistence + `DEFAULT_POLICY` (`packages/wallet/src/policy.ts`); tested allow/deny.
- Depends-on: T-301
- Scope: wallet
- Acceptance: enforces max trade size + token allowlist before signing; rejects over-limit with a clear error; tested.

---

## 4 — Frontend UI

> **Next.js (App Router, React 19)**. **6 routes + wallet drawer** (PRD §11a–§11g). Build to `design-system/autonoe/MASTER.md`. Use the `frontend-design` skill for polish, `web3-vfx-stack` for the landing. Mock API responses (PRD §12) until endpoints land. Client-only libs (wagmi, Lenis/GSAP, charts) need `'use client'`.

### T-401 — App scaffold + routing + theme
- Status: done @Claude 2026-06-03 — Next.js 16 App Router (Tailwind v4, Turbopack) in `web/`; ported design tokens/atmosphere to `app/globals.css`, fonts via next/font, wagmi Providers (injected/MetaMask, Mantle Sepolia), AppShell nav + wallet-drawer stub, Lenis smooth-scroll, 6 route stubs, `next.config` rewrites `/api/*`→bun backend. `tsc` + `next build` green.
- Depends-on: —
- Scope: web
- Acceptance: **Next.js App Router** app scaffolded with bun (`bunx create-next-app`); 6 routes as `app/` segments (`/`, `/markets`, `/trade`, `/studio`, `/history`, `/settings`); design tokens applied (dark OLED, gold `#F59E0B` + purple `#8B5CF6`, Orbitron/Exo 2); motion/VFX deps via bun (Lenis, gsap + @gsap/react, framer-motion); a client Providers wrapper for wagmi/RainbowKit; MetaMask connect on Mantle Sepolia. Add `web` to root `workspaces`. See PRD §10a boundary + §11b motion stack + §11h workflow.

### T-404 — Landing page (`/`) — VISUAL TEMPLATE
- Status: done @Claude 2026-06-03 — `app/page.tsx` + `components/landing/*` (Hero char-split, Tribunal flow, HowItWorks, Benchmark count-up, MarketsPreview, FinalCta); GSAP/useGSAP reveals. `next build` green.
- Depends-on: T-401
- Scope: web
- Acceptance: **built first as the visual reference for the whole app** (PRD §11h). Full motion stack — Lenis smooth scroll + GSAP/ScrollTrigger + Aceternity/Magic UI hero effects + gold/purple atmosphere. Sections: hero + how-it-works (thesis → judge → execute) + on-chain-benchmark pitch + "Launch App" CTA. Reviewed via screenshot/preview and iterated to approval; the approved tokens + motion language become the template the other routes inherit.

### T-405 — Trade page — chart + execute (`/trade`)
- Status: done @Claude 2026-06-03 — `app/trade/page.tsx` + `components/trade/*` (SVG chart, pair selector, swap box, balances). **UI only on sample data**; live price feed + real swap wiring tracked in T-409/T-601.
- Depends-on: T-401, T-304
- Scope: web
- Acceptance: TradingView embed for the selected pair; manual swap/execute via `packages/wallet`; balances/positions.

### T-406 — Trade page — side AI rail
- Status: done @Claude 2026-06-03 — `components/trade/AiRail.tsx`: Quick Thesis (option card + "Show thinking" + "Refine in Judge Panel"→/studio) and Assistant chat tabs. **UI only on sample data**; live `/api/thesis` + `/api/assistant` wiring tracked in T-601.
- Depends-on: T-405, T-403, T-205, T-208
- Scope: web
- Acceptance: tabbed rail — Quick Thesis (intent → inline thesis + "Refine in Judge Panel" → `/studio`) and Assistant chat (`/api/assistant`); reasoning traces shown.

### T-407 — Studio Step 1 — Thesis (AI or human) (`/studio`)
- Status: done @Claude 2026-06-03 — `app/studio/page.tsx` + `components/studio/*`: intent input, source toggles, AI/human modes, risk-tiered option cards + "Show thinking". **UI only on sample data**; live `/api/thesis`(`/human`) wiring tracked in T-601.
- Depends-on: T-401, T-403
- Scope: web
- Acceptance: AI mode fires `POST /api/thesis`; human mode posts `/api/thesis/human`; renders risk-tiered option cards + pair suggestion + thesis reasoning trace; per-option branch buttons "Execute" / "Send to Judge Panel".

### T-408 — Studio Step 2 — Judge Panel
- Status: done @Claude 2026-06-03 — `components/studio/StepJudge.tsx` + `TribunalFlow.tsx`: Supporter/Discriminator/Judge columns with traces, verdict bar, refined options + animated confidence bars. **UI only on sample data**; live `/api/debate` wiring tracked in T-601.
- Depends-on: T-407, T-403
- Scope: web
- Acceptance: Supporter/Discriminator/Judge arguments (each with a reasoning trace), verdict, and refined options with predicted % + risk + caveats graphed; "Execute" per option.

### T-409 — Execute flow (shared)
- Status: in-progress @prithwish 2026-06-06
- Depends-on: T-407, T-408, T-304
- Scope: web
- Acceptance: from a chosen option (direct from thesis OR from judge) → confirm → tx status + PnL + mantlescan link (calls `packages/wallet` execute).

### T-411 — History / Benchmark page (`/history`)
- Status: pending
- Depends-on: T-401, T-207
- Scope: web
- Acceptance: DecisionLog records + PnL-over-time / win-rate charts + mantlescan links; reads `/api/history`.

### T-412 — Model performance leaderboard
- Status: pending
- Depends-on: T-411, T-207
- Scope: web
- Acceptance: on the Benchmark page, ranks models per role (thesis/supporter/discriminator/judge) by realized outcome; reads `/api/leaderboard`.

### T-414 — Markets overview page (`/markets`)
- Status: done @Claude 2026-06-03 — `app/markets/page.tsx` + `components/markets/*`: stats header (count-up), gainers/losers, sortable table w/ favorites + sparklines, rows→/trade. **UI on sample data**; live feed via T-204 wiring tracked in T-601.
- Depends-on: T-401, T-405
- Scope: web
- Acceptance: Binance-style markets overview (PRD §11g) — market-stats header, sortable table of all `mUSD/<asset>` pairs (price, 24h %, 24h volume, sparkline), top gainers/losers strip, favorite toggle; clicking a row opens `/trade` with the pair preloaded. Reuses the market price feed (T-204 / T-405), no new backend contract.

---

## 5 — Infra / DevOps / Docs

### T-503 — Push repo to GitHub + secrets + branch protection
- Status: pending
- Depends-on: —
- Scope: infra
- Acceptance: create the GitHub remote and push; add repo secrets `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` (Settings → Secrets → Actions); confirm CI runs on PRs and the Telegram bot posts to the team chat; enable branch protection on `main` requiring the CI check. **This unblocks the entire claim/PR + notification workflow.**

---

## 6 — Integration & Demo

### T-602 — Wire wallet ↔ chain lib (real swap)
- Status: pending
- Depends-on: T-304, T-108
- Scope: integration
- Acceptance: a real `mUSD/WMNT` swap executes from the agent wallet on testnet.

### T-603 — On-chain logging live
- Status: pending
- Depends-on: T-304, T-105, T-207
- Scope: integration
- Acceptance: each executed option writes to DecisionLog; the history page shows the on-chain record.

### T-604 — E2E happy path
- Status: pending
- Depends-on: T-601, T-602, T-603
- Scope: integration
- Acceptance: intent → thesis → debate → swap → on-chain log passes end-to-end (local fork or live Mantle Sepolia).

### T-605 — Demo polish + script
- Status: pending
- Depends-on: T-604
- Scope: docs
- Acceptance: UI passes a design review; the demo narrative (PRD §16) is rehearsed; mantlescan links work.

---

## Done

_(newest first)_

### T-304 — Agent-sign + execute
- Status: done @prithwish 2026-06-06 — `packages/wallet/src/execute.ts` (exported via the barrel): `executeOption(input, deps?)` orchestrates **manual-confirm guard** (`confirmed` must be `true` — no auto-execute, thrown before any I/O) → **spending-policy check** (T-303 `enforcePolicy`: hard cap + token allow-list) → **swap via the chain lib** (T-108 `swap()` = approve + `swapExactTokensForTokens` + slippage) → **DecisionLog write** (T-108 `writeDecision()`, `pnl` 0n on an open; realized PnL is T-603), returning the **shared `SwapResult`** (`{ txHash, amountIn, amountOut, explorerUrl }`) + the decision tx hash. Pure helpers `buildSwapPlan` (direction-aware path/amountIn: long/hold/hedge → mUSD→asset @6dec, short → asset→mUSD @18dec) + `scaleToBaseUnits`. Chain deps are injectable → 14 new offline tests (confirm guard, over-cap, disallowed token, long/short path + scaling, shared-shape mapping). `tsc -b` clean; `bun test` wallet 35/35.
- Depends-on: T-301, T-303, T-108
- Scope: wallet
- Acceptance: given a chosen option, builds + signs + submits a swap via the chain lib; returns `SwapResult`; triggers the DecisionLog write. Execution is manual-confirm (no auto-execute).

### T-108 — viem chain library
- Status: done @jishnu 2026-06-06 — `packages/chain/src/{clients,swapExecutor,decisionLog,abis}.ts`: viem public/wallet clients (`defineChain` Mantle Sepolia) + deployed-address registry; `getQuote()` (router `getAmountsOut`); `swap()` (approve → `swapExactTokensForTokens` with bps slippage floor, realized `amountOut` parsed from receipt Transfer logs — robust against load-balanced-RPC read lag); `writeDecision()`/`readHistory()` over DecisionLog. Added `viem` to the package deps. **Integration test executed a real swap + DecisionLog round-trip on Mantle Sepolia** (`src/swap.integration.test.ts`, skips without `DEPLOYER_PRIVATE_KEY` so CI stays green — 2 pass / 2 skip there). `tsc` 6/6; full suite green.
- Depends-on: T-107
- Scope: chain
- Acceptance: `packages/chain/src/{clients,swapExecutor,decisionLog}.ts` — `getQuote()`, `swap()` (approve + `swapExactTokensForTokens` + slippage), `writeDecision()`, `readHistory()`. An integration test executes a real swap on testnet.

### T-305 — Funding helpers
- Status: done @prithwish 2026-06-06 — `packages/wallet/src/funding.ts` (exported via the package barrel): **native MNT faucet link surfaced** (`MNT_FAUCET_URL` ← `@autonoe/chain` `FAUCET_URL`) + live `MUSD_ADDRESS` from `@autonoe/chain/addresses.json`; **faucet re-mint call** `claimMusdFaucet(privateKey)` (writes mUSD `faucet()`, waits receipt, throws on revert w/ cooldown/cap hint, returns `{ hash, explorerUrl }`); **auto-seed on creation** `seedAgentWallet(privateKey, address)` — guards on zero native MNT (a fresh EOA can't pay gas) returning `{ seeded:false, needsGas:true, mntFaucetUrl }`, else claims the faucet; plus `musdBalance(address)`. Clients are injectable (`PublicClientLike`/`WalletClientLike`) so it's unit-tested fully offline with fakes; real path uses inline viem clients on Mantle Sepolia. Added `@autonoe/chain` dep to the wallet package. `tsc -b` clean; `bun test` 22/22 (14 existing + 8 new).
- Depends-on: T-107
- Scope: wallet
- Acceptance: auto-seed mUSD on wallet creation + faucet re-mint call; native MNT faucet link surfaced.

### T-209 — Web search / news tool
- Status: done @prithwish 2026-06-06 — `server/src/market/news.ts` (`searchNews`, injectable `NewsFetcher` POST client) + a `search_news` tool registered in `server/src/agents/tools.ts` gated by `subagent.news`, recording a `subagent.news` reasoning trace. Surfaced to the thesis tool loop automatically (`subagent.news` ∈ `SUBAGENT_ROLES`), so theses can cite news/sentiment; the `thesis` SYSTEM prompt now lists news evidence, and the UI data-source toggles control it. **Degrades gracefully**: with no `TAVILY_API_KEY` the tool returns "not configured" and theses still run on price/indicators/on-chain — never throws. 6 new offline tests (injected fetcher: field mapping, no-key guard, HTTP-error throw, allow-list gating, trace recording). `bun test` server 26/26, `tsc` clean.
- Depends-on: T-202, T-205
- Scope: api
- Acceptance: a Tavily (or Brave/Exa) web-search tool registered for `subagent.news` and surfaced to the thesis agent's tool loop, so theses can cite news/sentiment.

### T-410 — Settings page (`/settings`)
- Status: done @prithwish 2026-06-06 — `web/components/settings/SettingsClient.tsx` (+ `settings.module.css`) on the `/settings` route: provider cards (password paste field + "Get a free key →" link + free-tier note, static fallback merged under live `/api/providers`); saving a key POSTs `/api/keys` then auto-loads that provider's models from `/api/models?provider=`; per-role model dropdowns for all 9 `AI_ROLES` incl. `assistant` (provider-grouped optgroups) persisted via PUT `/api/roles`; data-source toggles for the 4 subagent roles (localStorage); graceful offline banner. Rebuilt on current `main` (the original branch predated jishnu's T-106/109/402/415/601 work). `tsc` clean across the workspace; `next build` green with `/settings` in the route table.
- Depends-on: T-401, T-203
- Scope: web
- Acceptance: per-provider paste field + "Get free key" link + free-tier note; auto-populate models on paste; per-role model dropdowns (incl. `assistant`); data-source toggles; persists via `/api/keys`, `/api/roles`.

### T-107 — Export addresses + ABIs
- Status: done @jishnu 2026-06-06 — **deployed the full stack live to Mantle Sepolia** (chain 5003) via new `contracts/scripts/deployAll.ts` (deploys all 7 contracts + seeds all 3 pools, txs serialized on receipts for public-RPC reliability; `bun run deploy:all[:testnet]`). Live addresses written to `packages/chain/addresses.json` (placeholder replaced) and all 8 ABIs to `packages/chain/abis/`. Contracts confirmed on-chain (bytecode present). Deployer `0x4523095f3d872dD51aAB5c6428b513AF645C15B5`; mUSD `0x1f7d…d7ef`, router `0x8c30…a2ab`, mUSD/WMNT pool `0x3D54…d6B8`. ⚠️ **Source-verification on mantlescan still pending** — needs `hardhat-verify` + an explorer API key (contracts are visible as bytecode now; one follow-up command away).
- Depends-on: T-106
- Scope: chain
- Acceptance: live Mantle Sepolia addresses written to `packages/chain/addresses.json` (replacing the placeholder) and ABIs to `packages/chain/abis/`; contracts verified on mantlescan.

### T-109 — Extra pools (stretch)
- Status: done @jishnu 2026-06-06 — `contracts/scripts/seedExtra.ts` creates + seeds the secondary **mUSD/MockBTC** and **mUSD/MockETH** pairs (mint both sides → approve → `addLiquidity`, ratios ≈ live spot, overridable via `SEED_BTC_*`/`SEED_ETH_*`). Self-contained: `bun run seed:extra` deploys a fresh stack on the in-process EDR network (no key) — validated end-to-end (both pairs created); for a live run after T-107 pass existing addresses via `MUSD_ADDR`/`MOCKBTC_ADDR`/`MOCKETH_ADDR`/`FACTORY_ADDR`/`ROUTER_ADDR` + `seed:extra:testnet`. `tsc` 6/6.
- Depends-on: T-106
- Scope: contracts
- Acceptance: `mUSD/MockBTC` and `mUSD/MockETH` pairs created + seeded via a `seedExtra.ts` script.

### T-106 — Deploy + seed script
- Status: done @jishnu 2026-06-06 — `contracts/scripts/deploy.ts` deploys mUSD + WMNT/MockBTC/MockETH + UniswapV2Factory/Router02 (WMNT as WETH) + DecisionLog, creates the `mUSD/WMNT` pair, seeds liquidity (`ownerMint` + wrap + `addLiquidity`, faucet-friendly `SEED_MUSD`/`SEED_WMNT` overrides), and prints every address (table + JSON). `bun run deploy` targets the in-process EDR network (no key) — validated end-to-end; `bun run deploy:testnet` (`DEPLOY_NETWORK=mantleSepolia` + `DEPLOYER_PRIVATE_KEY` + `MANTLE_SEPOLIA_RPC`) does the live run, which is **T-107**'s job. Per repo convention, viem-contract scripts are checked/run by Hardhat (not tsc), so `scripts/` is excluded from the contracts tsconfig like `test/`. `tsc` 6/6, offline tests pass.
- Depends-on: T-102, T-103, T-104, T-105
- Scope: contracts
- Acceptance: `contracts/scripts/deploy.ts` deploys all tokens + factory + router + DecisionLog, creates the `mUSD/WMNT` pair, seeds liquidity, and prints all addresses.

### T-601 — Wire UI ↔ server (real endpoints)
- Status: done @jishnu 2026-06-06 — typed API client (`web/lib/api.ts`) over the `@autonoe/shared` contract. The Studio flow now renders **live**: `StepThesis` calls `/api/thesis` (AI, data-source toggles → `subagent.*` roles) or `/api/thesis/human`, and `StepJudge` calls `/api/debate` on the lifted thesis (Supporter/Discriminator/Judge arguments + traces + refined options + verdict + prediction chart) — state lifted into `Workspace`, all sample arrays gone. Trade `AiRail` Quick Thesis → `/api/thesis`, Assistant → `/api/assistant`. Loading + graceful error states (missing-key errors deep-link to `/settings`). Verified: server reachable, `/api/thesis` returns a live thesis with a key and the structured `{error}` the UI surfaces without one. `tsc` 6/6, `next build` green.
- Depends-on: T-205, T-206, T-401
- Scope: integration
- Acceptance: thesis + debate render from the live API, no mocks.

### T-415 — Interactive prediction chart
- Status: done @jishnu 2026-06-06 — new `GET /api/candles?asset=&interval=&limit=` (`server/src/market/candles.ts` over the Bybit market layer; validates asset/interval, clamps limit ≤500) so the UI never calls Bybit directly. `web/components/trade/PredictionChart.tsx` renders real OHLCV via TradingView **lightweight-charts** with an **entry line + predicted-return band** (low/high target price lines) + target marker for the selected option, and a crosshair OHLC tooltip. Wired into `/trade` (`ChartPanel`, timeframe chips → Bybit intervals, per-pair band) and the `/studio` verdict view (`StepJudge`, preferred option's band). Added shared `Candle` type + `candles` route to the API contract. Verified: endpoint returns live MNTUSDT candles + 400s bad input; `tsc` 6/6, `bun test` (server 19/19 incl. 3 new, shared 4/4), `next build` green.
- Depends-on: T-405, T-204
- Scope: web
- Acceptance: real candles via TradingView **lightweight-charts** fed by Bybit data (through the server/market layer), with the Judge's **predicted-return band** + entry/target markers overlaid on the selected option, and hover tooltips. Used on `/trade` and the `/studio` verdict view to visualize the thesis prediction. Add a server endpoint to expose candles (or reuse the market tool output) so the UI doesn't call Bybit directly.

### T-402 — Global shell + wallet drawer
- Status: done @jishnu 2026-06-06 — global slide-over wallet drawer (`web/components/wallet/{WalletProvider,WalletDrawer}.tsx`) reachable from every route via the AppShell nav. Cleanly separates the **funding wallet** (MetaMask/wagmi) from the autonomous **agent wallet** (`@autonoe/wallet`) with an "Acting · Agent" indicator + colour-coded cards. Agent wallet: create/unlock/lock (passphrase, localStorage `WalletStore` in `web/lib/walletStore.ts`), export private key (clipboard) + keystore JSON (download), spending-limits editor (`getPolicy`/`setPolicy`). Balances + faucet are sample data pending the chain lib (T-602). Persistent "testnet · not financial advice" marker on every route. Made `@autonoe/wallet` consumable from a strict-DOM tsconfig by emitting `dist` + `.d.ts` (mirrors `@autonoe/chain`). `tsc` (6/6), `bun test` (wallet 14/14), `next build` green.
- Depends-on: T-401, T-301
- Scope: web
- Acceptance: persistent nav + a global slide-over wallet drawer reachable from every route; balances/fund/export/limits (calls `packages/wallet`); clearly distinguishes funding wallet (MetaMask) vs autonomous agent wallet with an "acting wallet" indicator; persistent "testnet · not financial advice" disclaimer.

### T-413 — Share thesis/verdict card
- Status: done @prithwish 2026-06-05 — reusable `web/components/share/ShareCard.tsx` `ShareButton` (client): one-click popover with a live canvas preview, **Copy link** (encodes the card into a `/studio#card=<base64>` deep link → clipboard) and **Download image** (renders a 1200×630 branded PNG via canvas). Closes on outside-click/Escape. Wired into the Judge verdict (`StepJudge`) and the thesis options header (`StepThesis`). `next build` + `tsc` green.
- Depends-on: T-407, T-408
- Scope: web
- Acceptance: one-click share of a thesis or verdict as an image/link card.

### T-403 — ReasoningTrace component ("Show thinking")
- Status: done @prithwish 2026-06-05 — canonical reusable `web/components/ReasoningTrace.tsx` (+ `.module.css`): collapsible native `<details>` (no client JS → works in any Server/Client Component), shows `summary` collapsed, expands to the `steps[]` timeline (PRD §12 `ReasoningTrace`), optional role badge + label. The studio `ThinkingTrace` is now a thin wrapper over it, so thesis (`StepThesis`) + judge (`StepJudge`) + subagent traces share one implementation with no changes to those callers. `next build` + `tsc` green.
- Depends-on: T-401
- Scope: web
- Acceptance: reusable collapsible trace — shows `summary` collapsed, expands to `steps[]` (PRD §12 `ReasoningTrace`); reused by thesis, subagents, and judges.

### T-104 — Uniswap V2 fork
- Status: done @prithwish 2026-06-05 — canonical Uniswap V2 vendored into `contracts/contracts/uniswap/` (core `@1.0.1` @ solc 0.5.16, periphery `@1.1.0-beta.0` @ 0.6.6) via a 3-compiler Hardhat config (0.5.16/0.6.6/0.8.28). Router02 deploys with WMNT as WETH. One modification: `UniswapV2Library.pairFor()` resolves via `factory.getPair()` instead of the mainnet-pinned CREATE2 init-code hash (won't match a locally compiled pair) — see `contracts/uniswap/README.md`. 2 Hardhat 3 + viem tests pass: `createPair` registers mUSD/WMNT; addLiquidity seeds reserves + router `getAmountsOut` quotes a swap (16 in the suite).
- Depends-on: T-103
- Scope: contracts
- Acceptance: canonical Uniswap V2 core + periphery (Factory, Router02) compiled with WMNT as WETH; `createPair` + quote works in a Hardhat test.

### T-105 — `DecisionLog` contract
- Status: done @prithwish 2026-06-05 — `contracts/contracts/DecisionLog.sol`: `logDecision(thesisHash, verdictHash, asset, amountIn, amountOut, pnl, optionRef)` appends a `Decision` (signed `int256` pnl, `string` optionRef matching the off-chain `RefinedOption.optionRef`, `asset` token address), indexes it per-user, and emits `DecisionLogged`. Getters: `totalDecisions`, `getDecision`, `getUserDecisionCount`, `getUserDecisionIds`, `getUserDecisions` (T-108 `readHistory` reads these for `/api/history`). 3 Hardhat 3 + viem tests pass (log+event+by-id, independent per-user histories, out-of-range revert) — 14 in the suite.
- Depends-on: T-101
- Scope: contracts
- Acceptance: `DecisionLog.sol` with `logDecision(thesisHash, verdictHash, asset, amountIn, amountOut, pnl, optionRef)` emitting an event + storing a per-user history; getters; tests pass.

### T-103 — Asset tokens (WMNT / MockBTC / MockETH)
- Status: done @prithwish 2026-06-05 — `WMNT.sol` (OZ ERC-20, 18-dec WETH-style wrapper: `deposit()`/`receive()` wrap native MNT 1:1, `withdraw()` redeems; `totalSupply` 1:1-backed; Deposit/Withdrawal events — router-ready for T-104). `MockBTC.sol` (mBTC) + `MockETH.sol` (mETH) extend a shared `MockERC20.sol` base (18-dec, open `mint()` for seeding/tests). 6 Hardhat 3 + viem tests pass (11 total in the suite).
- Depends-on: T-101
- Scope: contracts
- Acceptance: `WMNT.sol` (WETH-style deposit/withdraw wrapper) + `MockBTC.sol` + `MockETH.sol` (18-dec mintable ERC-20). Tests pass.

### T-102 — `mUSD` stablecoin
- Status: done @prithwish 2026-06-05 — `contracts/contracts/mUSD.sol`: OpenZeppelin ERC-20 + Ownable, 6 decimals; `faucet()` mints a fixed 1,000 mUSD with an 8h per-address cooldown + a 10,000 lifetime cap (emits `FaucetClaimed`); `ownerMint()` for seeding (T-106). 5 Hardhat 3 + viem tests pass (decimals/name, faucet mint, cooldown revert, cap revert, owner-only mint). Hardhat node:test files live in `contracts/test/` (run via `bun run test:hardhat`); the offline bun smoke suite moved to `contracts/test-unit/` (CI gate, no runner collision).
- Depends-on: T-101
- Scope: contracts
- Acceptance: `contracts/contracts/mUSD.sol` — ERC-20, 6 decimals; `faucet()` mints a fixed amount with per-address cooldown + cap; `ownerMint()` for seeding. Hardhat tests pass.

### T-101 — Hardhat project + Mantle Sepolia config
- Status: done @prithwish 2026-06-05 — Hardhat 3 (ESM + viem) scaffold in `contracts/`: `hardhat.config.ts` (solc 0.8.28; `hardhat` edr-simulated + `mantleSepolia` http networks, both chain 5003), `config/networks.ts` (frozen chain constants shared with the config + a `bun test` smoke suite), empty `contracts/` sources dir. `hardhat compile` → "Nothing to compile", exit 0. RPC from `MANTLE_SEPOLIA_RPC` (public default), deployer from `DEPLOYER_PRIVATE_KEY` via lazy `configVariable` (compile/edr tests need no key). Added `contracts` to root `workspaces`. Unblocks T-102/103/105.
- Depends-on: —
- Scope: contracts
- Acceptance: `contracts/` with `hardhat.config.ts`; `npx hardhat compile` passes; network `mantleSepolia` (5003) configured from `DEPLOYER_PRIVATE_KEY` + RPC env. Add `contracts` to root `workspaces`.

### T-502 — Workflow helper scripts (lint-todo + leaderboard)
- Status: done @Claude 2026-06-02
- Depends-on: T-001
- Scope: infra
- Acceptance: `scripts/lint-todo.ts` (validates this file's structure — unique ids, valid Status, Acceptance present; CI-gated) and `scripts/leaderboard.ts` (git-log tally for the Telegram "today's tally" post). Both run under bun.

### T-501 — CI + Telegram-notify workflows (bun)
- Status: done @Claude 2026-06-02
- Depends-on: T-001
- Scope: infra
- Acceptance: `.github/workflows/ci.yml` (bun install --frozen-lockfile → lint-todo → `bun --filter '*' typecheck` → `bun --filter '*' test`) and `.github/workflows/telegram-notify.yml` (Telegram-only: PR opened/conflict/merged + push to main, tagged CLAIM/REVIEW/DONE/CONFLICT/MERGED, plus a leaderboard post). Goes live once T-503 sets the secrets.

### T-004 — Env + network config
- Status: done @Claude 2026-06-02
- Depends-on: T-001
- Scope: chain
- Acceptance: `.env.example` (provider keys, RPC, deployer key); `packages/chain/src/network.ts` exports `mantleSepolia` (viem-shaped, chain 5003), `txUrl`/`addressUrl`, faucet/explorer constants; placeholder `packages/chain/addresses.json` (Track 1 fills via T-107).

### T-003 — Freeze REST API contract
- Status: done @Claude 2026-06-02
- Depends-on: T-001
- Scope: shared
- Acceptance: `packages/shared/src/api.ts` — `API` route map + typed request/response for all 10 endpoints (PRD §12).

### T-002 — Freeze shared types
- Status: done @Claude 2026-06-02
- Depends-on: T-001
- Scope: shared
- Acceptance: `packages/shared/src/types.ts` — all PRD §12 domain types exported as `@autonoe/shared` (incl. `ReasoningTrace`, `assistant` role, `Thesis.source/suggestedPair/reasoning/traces/modelsUsed`, role/asset const arrays). Smoke-tested via `bun test`.

### T-001 — Monorepo scaffold (bun)
- Status: done @Claude 2026-06-02
- Depends-on: —
- Scope: setup
- Acceptance: bun workspaces (`packages/*`), `tsconfig.base.json` + project references, `bun install` + `bun run build` + `bun --filter '*' typecheck`/`test` all green. Track owners add `web`/`server`/`contracts`/`packages/wallet` to root `workspaces` when they scaffold.

---

## Blocked

_(none)_
