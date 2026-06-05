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

## 🔴 Blocking (a task is stuck until you act)

_(none right now — I have everything I need to keep building. The only thing
needed before the FULL live demo is an AI provider key — see 🟡 #1 — but I'll
build + mock around it so nothing is blocked.)_

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
