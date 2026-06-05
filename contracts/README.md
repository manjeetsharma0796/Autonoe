# @autonoe/contracts

Track 1 — Solidity contracts for Autonoe, on **Mantle Sepolia (chain 5003)**.
Built with **Hardhat 3** (ESM + viem). This is the home for `mUSD`, the asset
tokens, the Uniswap V2 fork, and `DecisionLog` (T-102 onward). T-101 ships only
the scaffold + network config — there are no `.sol` sources yet, so `compile`
reports "Nothing to compile".

## Layout

| Path | What |
|---|---|
| `hardhat.config.ts` | Hardhat 3 config — solc 0.8.28 / 0.6.6 / 0.5.16 (multi-compiler for the Uniswap fork), `hardhat` (edr-simulated) + `mantleSepolia` (http) networks |
| `config/networks.ts` | Frozen chain constants (chain id, default RPC, env var names) shared with the config + tests |
| `contracts/` | Solidity sources — `mUSD`, asset tokens (`WMNT`/`MockBTC`/`MockETH`), `DecisionLog`, and the vendored `uniswap/` V2 fork (see `contracts/uniswap/README.md`) |
| `test/` | `bun test` smoke tests (CI gate); Hardhat/viem contract tests arrive with the contracts |

## Commands (run from this dir, or `bun --filter '@autonoe/contracts' <script>`)

```bash
bun run compile      # hardhat compile
bun run typecheck    # tsc --noEmit  (CI gate)
bun run test         # bun test      (CI gate — config smoke tests)
bun run test:hardhat # hardhat test  (on-chain/viem tests, once contracts exist)
```

## Network config

`mantleSepolia` reads:

- `MANTLE_SEPOLIA_RPC` — RPC URL (defaults to the public `https://rpc.sepolia.mantle.xyz`)
- `DEPLOYER_PRIVATE_KEY` — deployer account, resolved lazily via Hardhat's
  `configVariable`, so `compile` and local `edr` tests work **without** a key set.

Set these in the repo-root `.env` (see `.env.example`). Use a throwaway testnet
account funded from the [Mantle Sepolia faucet](https://faucet.sepolia.mantle.xyz/).

> First `hardhat` run: Hardhat 3 shows a one-time interactive telemetry prompt.
> The `compile` / `test:hardhat` scripts set `HARDHAT_DISABLE_TELEMETRY_PROMPT=true`
> to skip it non-interactively. On Windows, prefix the env var manually or set it
> in your shell if you invoke `hardhat` directly.
