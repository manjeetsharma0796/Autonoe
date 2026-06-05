# Operator handoff — things that need YOU (manjeet)

> I (the agent) am working through the TODO autonomously. Whenever I need
> something only you can provide, it lands here. Check the **🔴 BLOCKING** items
> first — those stop progress on a task. 🟡 = optional / improves the demo.
> Reply by editing this file, dropping keys into `.env.local`, or telling me.
>
> Last updated: 2026-06-05

---

## 🎯 Definition of Done (locked 2026-06-05)
**Working E2E demo, local** — `intent → thesis → debate → swap → on-chain log → history`
runs end-to-end on localhost with the UI on live APIs. No hosting this run.
Design: **keep current gold/purple system** (Binance blend deferred).
Orchestration: **fan out to Sonnet subagents** for routine/independent work
(UI pages, wiring, funding helpers); **Opus (me)** keeps money/security-critical
work (oracle signing, wallet execute) + integration verification + adversarial review.

## ✅ STATUS: E2E demo is BUILT and the on-chain half is VERIFIED LIVE
Everything compiles (`next build` green, 7 routes) and all 58 tests pass. The full
execute loop is proven on Mantle Sepolia: **agent wallet → server-signed oracle price →
real on-chain trade (AMM swap *and* synthetic) → DecisionLog → /api/history**. Both
trade paths verified live. The wallet drawer, settings, studio, and history pages are wired.

## 🔴 The ONE thing only you can do (to run the *AI* half of the demo)
**Add an AI provider key** so the live thesis + debate steps work:
- Drop one of `GROQ_API_KEY` / `MISTRAL_API_KEY` / `NVIDIA_API_KEY` / `OPENROUTER_API_KEY` / `GEMINI_API_KEY`
  into `.env.local`, **or** paste it in the app's `/settings` page (no restart needed). Groq free tier is fastest: https://console.groq.com/keys
- Without it: you can still create the agent wallet and execute a manual trade → see it logged on-chain (`/history`). **With it**: the full `intent → thesis → debate → execute → log → history` flow runs.
- This is the only blocker for the *complete* live walkthrough. Everything else is done and verified. See `RUNNING.md` to start it (needs `bun` + `node`).

---

## 🟡 Optional / needed before the FULL live demo (not blocking the build)

### 1. AI provider key (for live thesis/debate against a real LLM)
- **What:** at least one of `GROQ_API_KEY` / `MISTRAL_API_KEY` / `NVIDIA_API_KEY` / `OPENROUTER_API_KEY` / `GEMINI_API_KEY` in `.env.local`.
- **Why:** the agent endpoints (thesis, debate, assistant) are built but need a model to call. Groq has a generous free tier — fastest to get going. You can also paste it in the app Settings later.
- **Status:** ⏳ waiting (not blocking — I'll build/wire everything and mock the LLM in tests).

### 2. Dedicated oracle signer (optional hardening)
- **What:** `ORACLE_SIGNER_PRIVATE_KEY` (a fresh throwaway key, no funds needed).
- **Why:** right now the on-chain oracle's trusted signer = your **deployer** address. That works, but a dedicated key decouples "thing that deploys" from "thing that signs prices." If you provide one, I'll rotate via `oracle.setSigner(...)`.
- **Status:** ⏳ optional. Leaving as-is (deployer signs) until you say otherwise.

### 3. GitHub secrets + branch protection (T-503)
- **What:** add repo secrets `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` (Settings → Secrets → Actions); optionally enable branch protection on `main` requiring the CI check.
- **Why:** turns on the CI + Telegram notification workflow. Not needed for me to build; needed for the team automation to fire.
- **Status:** ⏳ optional (solo build doesn't need it).

### 4. Tavily / web-search key (T-209, deferred)
- **What:** `TAVILY_API_KEY`.
- **Why:** only if you want theses to cite news/sentiment. Explicitly deferred in scope.
- **Status:** ⏳ optional.

---

## ✅ Resolved
- Deployer key provided → all 7 contracts deployed + verified on Mantle Sepolia (T-101→107 done).

---

## 📓 Progress log (most recent first)
- 2026-06-05 (stretch) — **All polish done** via 4 parallel Sonnet agents on disjoint files + Opus review: Benchmark dashboard (PnL chart + win-rate + per-role leaderboard, T-411/412), prediction chart with the Judge's predicted-return band (candles endpoint + SVG chart, T-415), shareable thesis/verdict PNG card (T-413), and a **frictionless Mono-style key UX** (provider chips + one key row + instant model list + global quick-panel, T-416 — closes the PRD "no forced trip to settings" gap you flagged). tsc + next build green; committed + pushed.
- 2026-06-05 (cont.) — **bun installed**; ran ALL suites green (4 shared + 5 chain + 14 wallet + 19 server + 16 contracts). Booted the server and **smoke-tested live**: `/api/price/sign` returns a real signed BTC price; **ran the full execute path** (wallet `executeOption` → live server oracle → chain `openSynthetic` → `DecisionLog` → `/api/history` shows the record) — **T-602/T-603 verified end-to-end on Mantle Sepolia**. Fixed a stale-read id bug (now parses ids from receipt events). T-601/403 web wiring + AssetSymbol reconcile committed. T-410 settings done (agent). Web drawer+execute (T-402/409) agent finishing.
- 2026-06-05 — **T-108 chain lib** done (live swap + synthetic verified). **T-210 oracle endpoint** done. **T-207 history/leaderboard** done (Sonnet agent). **T-304/305 wallet execute+funding** implemented (under Opus adversarial review). **T-601/T-403 web wiring** in progress (Sonnet agent). All committed except wallet (awaiting review) + web (in progress).
- 2026-06-05 — Contracts track T-101→T-107 done; deployed + Sourcify-verified on Mantle Sepolia. Branch `feat/T-101-contracts-hybrid` pushed.

## ✅ Done so far (this session)
Contracts (T-101→107) · chain lib (T-108) · oracle endpoint (T-210) · history/leaderboard (T-207) ·
**wallet execute+funding (T-304/305) — Opus-reviewed, C1/H1 fixed, committed**.
Remaining to E2E demo: web wiring (T-601/403, agent finishing) → commit · wallet drawer (T-402) ·
execute flow UI (T-409) · settings (T-410) · history page (T-411) · integration+E2E (T-602/603/604) · polish (T-605).

## 🧹 Known cleanup
- ~~`AssetSymbol` MockBTC/MockETH → WMNT/BTC/ETH/SUI/SOL~~ **DONE** — reconciled across shared types,
  server agents (thesis/tools/assistant enums + prompts), bybit map, and web sample data. tsc green everywhere.
