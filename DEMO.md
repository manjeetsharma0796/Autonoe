---
title: Autonoe — Demo Day runbook
purpose: Rehearsed demo script, pre-flight checklist, verified on-chain links, and the design-review sign-off (T-605)
last_updated: 2026-06-06
---

# Autonoe — Demo Day runbook

Autonoe is an autonomous AI trading **thesis → debate → execute** copilot on **Mantle Sepolia (chain 5003)**. Every executed decision is logged **on-chain** — that immutable DecisionLog is the benchmark. This runbook is the rehearsed narrative (PRD §16), the pre-flight checklist, the live explorer links, and the design-review sign-off.

> **Disclaimer shown in-app on every route:** *testnet · not financial advice.*

---

## 0. Pre-flight checklist (do this BEFORE you present)

- [ ] **Backend up** — `bun run --filter '@autonoe/server' dev` (or `bun server/src/index.ts`); listens on `:8787`. `web` proxies `/api/*` to it.
- [ ] **Frontend up** — `cd web && bun run dev` (Next.js 16). Open `http://localhost:3000`.
- [ ] **Provider key set** — Settings (`/settings`) → paste a free **Mistral / Groq / Gemini / NVIDIA / OpenRouter** key (stored encrypted at rest). Confirm models auto-populate and assign roles (thesis / supporter / discriminator / judge / assistant).
- [ ] **Agent wallet ready** — open the wallet drawer → create the agent wallet (passphrase). Note the **agent address** (distinct from your MetaMask funding wallet — the drawer labels them "Acting · Agent" vs "Funding · MetaMask").
- [ ] **Gas + mUSD** — fund the agent address with testnet **MNT** (native faucet link surfaced in the drawer: <https://faucet.sepolia.mantle.xyz/>), then claim **mUSD** (faucet). The execute dialog also surfaces the faucet hint if funds are short.
- [ ] **Smoke test the full path (optional but recommended):**
  ```bash
  # from repo root, with MISTRAL_API_KEY + DEPLOYER_PRIVATE_KEY in .env
  bun run e2e
  ```
  This drives intent → thesis → debate → real swap → on-chain log and asserts `/api/history` surfaces the trade. A green run means the live demo will work.
- [ ] **Explorer reachable** — open <https://sepolia.mantlescan.xyz> in a tab.

---

## 1. The rehearsed narrative (PRD §16)

Drive the live trade from **`/studio`** (the Studio flow is the wired, live execute path). On `/trade` the swap box + flip button are illustrative sample UI — show the chart there, but execute from Studio.

| # | You do | You say | Expected on screen |
|---|--------|---------|--------------------|
| 1 | Connect MetaMask, open the wallet drawer, show the **agent wallet** (funded mUSD/MNT) | "Autonoe runs its own autonomous agent wallet — separate from my funding wallet, with a spending policy I control." | Drawer shows colour-coded **Funding · MetaMask** vs **Acting · Agent** cards; balances + spending limits |
| 2 | Go to `/studio`, type an **intent**, leave data-source toggles on, hit generate | "I tell it what I want to consider. Toggled subagents — market, indicators, on-chain, news — gather real evidence." | A multi-option, **risk-graded thesis**; each option shows predicted % band; **"Show thinking"** expands per-subagent reasoning traces |
| 3 | Click **To Judge** → Step 2 | "It forwards to a tribunal: a Supporter, a Discriminator, and a Judge — each on its own model — argue and refine." | **Supporter / Discriminator / Judge** columns with traces, a **Verdict** bar, and refined options (predicted % + risk + caveats + confidence) |
| 4 | Pick an option → **Execute** → confirm in the dialog (passphrase) | "I confirm — the agent wallet signs and submits a **real swap** on Mantle Sepolia. It never auto-executes." | Confirm → signing → **success**: tx in→out + **"View on Mantlescan"** link |
| 5 | Open `/history` | "Every decision is written **on-chain** to our DecisionLog — that's the benchmark. Here's the record, with the model that produced it, linking straight to the explorer." | History row: the decision + tx, **mantlescan links** for the tx hash and the agent address, model attribution |

**Stage hygiene (from the design review):**
- Execute from **`/studio`**, not `/trade`. Don't click the `/trade` **flip** or **"Execute swap"** buttons — they're sample UI with no handler.
- If the history record lags a beat after execution, that's public-RPC replica lag — refresh; it surfaces within seconds (the `e2e` script polls for exactly this).

---

## 2. Live on-chain proof (Mantle Sepolia · chain 5003)

Explorer base: **https://sepolia.mantlescan.xyz**

### Deployed contracts (T-107)
| Contract | Address | Link |
|---|---|---|
| mUSD (stablecoin) | `0x1f7d7c437858e88b10f73e6590db1bb189cad7ef` | [explorer](https://sepolia.mantlescan.xyz/address/0x1f7d7c437858e88b10f73e6590db1bb189cad7ef) |
| WMNT | `0xd016177ecd39af52391e4cb69de55f69894f1b65` | [explorer](https://sepolia.mantlescan.xyz/address/0xd016177ecd39af52391e4cb69de55f69894f1b65) |
| UniswapV2 Router02 | `0x8c30e0ad5c43d6dbd3abc5e305fcf5d0cd47a2ab` | [explorer](https://sepolia.mantlescan.xyz/address/0x8c30e0ad5c43d6dbd3abc5e305fcf5d0cd47a2ab) |
| UniswapV2 Factory | `0xffa61e5f6831d53028fef31d0e6d9465186258df` | [explorer](https://sepolia.mantlescan.xyz/address/0xffa61e5f6831d53028fef31d0e6d9465186258df) |
| **DecisionLog** (the benchmark) | `0x95e94ca1d33fbcb5bb8fafbfd90cc1cf2503ea58` | [explorer](https://sepolia.mantlescan.xyz/address/0x95e94ca1d33fbcb5bb8fafbfd90cc1cf2503ea58) |
| mUSD/WMNT pool | `0x3D5448eD2e45fbdC2F997B2614189d36a20Bd6B8` | [explorer](https://sepolia.mantlescan.xyz/address/0x3D5448eD2e45fbdC2F997B2614189d36a20Bd6B8) |

(Source of truth: `packages/chain/addresses.json`.)

### Sample end-to-end run (T-604, `bun run e2e`)
A real intent → thesis → debate → swap → on-chain-log pass:
- **Swap** (mUSD → WMNT): [`0xa45161…f72e98f`](https://sepolia.mantlescan.xyz/tx/0xa4516180d8cbe337e6b07dcd0ed33ac634b523587d6ce5d0304616748f72e98f)
- **DecisionLog write**: [`0x491b9b…64eb9427`](https://sepolia.mantlescan.xyz/tx/0x491b9b71ced5ea5ba5301def6890aaa8d4a454e70cb674a7f4acae0064eb9427)

---

## 3. Design-review sign-off

A full UX/brand review against `design-system/autonoe/MASTER.md` was completed for Demo-Day readiness.

**Verdict: PASS-WITH-NITS** — demo-ready; the five-step narrative, theme, disclaimers and mantlescan links all land. **No blockers.**

**Confirmed:**
- ✅ Persistent **"testnet · not financial advice"** disclaimer on every route (global `AppShell`), reinforced in studio/trade/markets footers, the execute dialog, and the wallet drawer.
- ✅ **Reasoning traces** ("Show thinking") on the thesis, every subagent, and all three judges (one canonical collapsible `ReasoningTrace`).
- ✅ **Agent-vs-funding wallet** distinction is explicit, colour-coded, and labelled in the wallet drawer.
- ✅ **Execute dialog accessibility**: `role=dialog` + `aria-modal` + `aria-label`, Escape-to-close (suppressed while signing), backdrop close, autofocus, `prefers-reduced-motion`.
- ✅ **Mantlescan links** on the execute-success view and on every History row (tx hash + agent address), via `@autonoe/chain` → `sepolia.mantlescan.xyz`.
- ✅ Brand/theme faithful to the locked template: OLED palette, gold `#F59E0B` / purple `#8B5CF6`, Orbitron/Exo 2/JetBrains Mono, the signature tribunal SVG on Landing + Studio.

**Non-blocking nits (deferred polish):**
- Disclaimer copy varies slightly ("Testnet · not financial advice" vs "Mantle Sepolia · not financial advice") — cosmetic.
- The global disclaimer bar is faint (`opacity .6`, 10px) and bottom-left — consider boosting opacity for projector legibility.
- `/trade` swap box, balances, block number, and chart are sample data; its **flip** and **"Execute swap"** controls have no handler — **demo the live execute from `/studio`** (already reflected in the script above).
- Wallet drawer is `role=dialog` but lacks `aria-modal` + Escape (weaker than the execute dialog).

These nits are tracked as future polish; none affect the Demo-Day narrative.
