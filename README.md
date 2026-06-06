# Autonoe

> **Your autonomous mind for on-chain trades.**

An AI trading copilot on **Mantle Sepolia** where a LangChain agent researches the market and produces a **multi-option trading thesis**, optionally stress-tested by a **three-agent debate panel** (Supporter → Discriminator → Judge), then executed by an **embedded agent wallet** as a real on-chain trade — with every decision and outcome **logged on-chain** as a verifiable AI performance benchmark.

Built for the Mantle "The Turing Test" Hackathon 2026 · *AI Trading & Strategy · Agentic Wallets & Economy · Best UI/UX*

---

## 🧠 How it works

```
User intent
    │
    ▼
THESIS AGENT  (LangChain.js · toggleable subagents)
    ├─ on-chain/DEX subagent      — AMM reserves + live price
    ├─ market-data/OHLC subagent  — Bybit candles
    ├─ technical indicators        — RSI / SMA / EMA / MACD
    └─ news/sentiment subagent    — macro narrative (optional)
    │
    ▼
THESIS  { options[]: direction, asset, sizeMUSD, rationale, predictedReturnPct, risk }
    │
    ├──► EXECUTE NOW   — agent wallet signs immediately
    │
    └──► DEBATE PANEL
             Supporter → Discriminator → Judge
             └─ refined options (predicted %, risk, caveats, confidence)
                          │
                          ▼
                  EXECUTE  (manual confirm)
                          │
                          ▼
              Real on-chain trade on Mantle Sepolia
                          │
                          ▼
              DecisionLog.sol  →  /history benchmark
```

### Hybrid execution engine

| Asset | Settlement |
|-------|-----------|
| **WMNT** | Real Uniswap-V2-style AMM swap (`mUSD/WMNT` pool) |
| **BTC · ETH · SUI · SOL** | Oracle-priced synthetic positions settled in mUSD — no per-asset ERC-20, no liquidity to seed |

The server signs a live price attestation `{symbol, price, timestamp}` (EIP-191); the `SyntheticExchange` contract verifies it on-chain via `ecrecover` and settles PnL in mUSD. Every trade — AMM or synthetic — is logged to `DecisionLog.sol`.

---

## 🚀 Deployed contracts — Mantle Sepolia · chain 5003

All contracts are **Sourcify-verified**. Addresses are the canonical source of truth in [`packages/chain/addresses.json`](packages/chain/addresses.json).

| Contract | Address | Explorer |
|----------|---------|---------|
| **mUSD** (test stablecoin, 6 dec) | `0x6F51259786A6dD1A35dea8A7fF8191C808881758` | [view ↗](https://sepolia.mantlescan.xyz/address/0x6F51259786A6dD1A35dea8A7fF8191C808881758) |
| **WMNT** (wrapped MNT, 18 dec) | `0x94b5D1401bD847B9f7b2E0553d6A885419D12042` | [view ↗](https://sepolia.mantlescan.xyz/address/0x94b5D1401bD847B9f7b2E0553d6A885419D12042) |
| **AmmFactory** | `0x8dFC3A0777B40009dE796560c4914f8f76F35bDd` | [view ↗](https://sepolia.mantlescan.xyz/address/0x8dFC3A0777B40009dE796560c4914f8f76F35bDd) |
| **AmmRouter** | `0x10DD80dc0962b8Ac4569287BB1f1023192561fd6` | [view ↗](https://sepolia.mantlescan.xyz/address/0x10DD80dc0962b8Ac4569287BB1f1023192561fd6) |
| **PriceOracle** (signed-pull) | `0xa8647941eb5b1F29d06428eBC81bCD3bE2C99e45` | [view ↗](https://sepolia.mantlescan.xyz/address/0xa8647941eb5b1F29d06428eBC81bCD3bE2C99e45) |
| **SyntheticExchange** | `0x912B6b677d4E22945Fb4e5E075CE0ADC95786754` | [view ↗](https://sepolia.mantlescan.xyz/address/0x912B6b677d4E22945Fb4e5E075CE0ADC95786754) |
| **DecisionLog** | `0xe1a4E05E6c9713DD7511EC1FbbB6a836E05c53D6` | [view ↗](https://sepolia.mantlescan.xyz/address/0xe1a4E05E6c9713DD7511EC1FbbB6a836E05c53D6) |
| **Pool mUSD/WMNT** | `0x3e71d74bAF021D5c66Caa457Ef51D06d2Ac362Ef` | [view ↗](https://sepolia.mantlescan.xyz/address/0x3e71d74bAF021D5c66Caa457Ef51D06d2Ac362Ef) |

**Synthetic markets** (oracle-priced, no per-asset contract): `BTC` · `ETH` · `SUI` · `SOL`

**Oracle signer**: `0x7176DC1B76a17BB502324Dd825EaB983F675DD7a`

---

## 🧱 Architecture — monorepo layout

| Directory | What it does |
|-----------|-------------|
| `contracts/` | Hardhat (solc 0.8.24, Mantle Sepolia): `mUSD`, `WMNT`, `AmmFactory`/`AmmRouter` (Uniswap-V2-style), `PriceOracle`, `SyntheticExchange`, `DecisionLog`; deploy + seed scripts |
| `packages/chain/` | viem clients, `swapExecutor`, `syntheticExecutor`, `decisionLog` reader/writer; canonical `addresses.json` + ABIs consumed by server and web |
| `packages/shared/` | Canonical TypeScript types (`Thesis`, `DebateResult`, `ThesisOption`, `RoleModelMap`, …) and the frozen REST API contract |
| `packages/wallet/` | Embedded EOA: generate / encrypt (WebCrypto PBKDF2/AES-GCM) / persist / export; spending-limit policy; `executeOption` (AMM or synthetic) |
| `server/` | Express on bun: provider proxy (Groq / Mistral / NVIDIA / Gemini / OpenRouter), LangChain.js thesis agent + subagents, debate graph, assistant chat, signed-price oracle endpoint, `bun:sqlite` kv for history |
| `web/` | Next.js 15 App Router (React 19): 6 routes (`/` · `/markets` · `/trade` · `/studio` · `/history` · `/settings`) + global wallet drawer; wagmi/viem; TradingView chart; SSE streaming |

---

## 🛠 Tech stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router, React 19), Tailwind CSS v4, wagmi + viem, Framer Motion + GSAP/Lenis |
| **Charts** | TradingView Advanced Chart widget + custom SVG prediction-band chart |
| **Backend** | Node/Express running on **bun**, `bun:sqlite` key-value store, SSE streaming |
| **AI agents** | LangChain.js — thesis agent, debate graph (Supporter/Discriminator/Judge), assistant |
| **Contracts** | Solidity 0.8.24 + Hardhat, custom Uniswap-V2-style AMM, signed-pull oracle |
| **Wallet** | In-browser viem EOA, WebCrypto encryption, MetaMask-importable keystore export |
| **Network** | Mantle Sepolia (chain ID 5003, native MNT) |

---

## ▶️ Quick start

**Prerequisites:** `bun` ≥ 1.1 · Node ≥ 20

```bash
# 1. Install all workspace dependencies
bun install

# 2. Build the chain library (consumed by server + web)
bun --filter '@autonoe/chain' run build

# 3. Set up environment
cp .env.example .env.local
# Add DEPLOYER_PRIVATE_KEY (funded testnet MNT) and one AI provider key
# — or paste the key directly in the app's /settings page after launch.

# 4. Run (two terminals)
cd server && bun src/index.ts      # AI/agent + oracle backend  →  :8787
cd web    && bun run dev           # Next.js UI                 →  :3000
```

Open **http://localhost:3000**, create your agent wallet in the drawer, fund it, and go to **/studio** to run your first thesis.

For the full guide — environment variables, demo flow, redeployment, and test commands — see **[RUNNING.md](RUNNING.md)**.

> An AI provider key is required for live thesis/debate generation. Groq offers a free tier at [console.groq.com/keys](https://console.groq.com/keys). You can paste it in `/settings` without restarting.

---

## 🔗 Links

| Resource | URL |
|----------|-----|
| Mantle Sepolia explorer | https://sepolia.mantlescan.xyz |
| Alternative explorer | https://explorer.sepolia.mantle.xyz |
| Chain ID | **5003** · native token **MNT** |
| MNT faucet | https://faucet.sepolia.mantle.xyz |
| Chainlink faucet (alt) | https://faucets.chain.link/mantle-sepolia |
| RPC | `https://rpc.sepolia.mantle.xyz` |
