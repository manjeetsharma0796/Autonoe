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
- 2026-06-05 — Contracts track T-101→T-107 done; deployed + Sourcify-verified on Mantle Sepolia. Branch `feat/T-101-contracts-hybrid` pushed. Starting T-108 (viem chain lib) next.
