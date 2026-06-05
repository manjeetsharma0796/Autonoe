# Uniswap V2 fork (vendored)

Canonical Uniswap V2 sources vendored into the Autonoe contracts so the DEX
deploys on Mantle Sepolia (T-104) and the deploy/seed script (T-106) can stand
up the `mUSD/WMNT` market. Compiled by the multi-compiler Hardhat config
(`../../hardhat.config.ts`): **core at solc `0.5.16`**, **periphery at `0.6.6`**.

## Provenance & license

- `core/` — verbatim from [`@uniswap/v2-core@1.0.1`](https://github.com/Uniswap/v2-core) (GPL-3.0). `UniswapV2Factory`, `UniswapV2Pair`, `UniswapV2ERC20` + interfaces/libraries. The `test/` helpers were dropped.
- `periphery/` — from [`@uniswap/v2-periphery@1.1.0-beta.0`](https://github.com/Uniswap/v2-periphery) (GPL-3.0): `UniswapV2Router02` + `UniswapV2Library`, `SafeMath`, `TransferHelper` (the last from `@uniswap/lib`), and the router interfaces.

These were copied in (not kept as npm deps) so the compile is deterministic and
self-contained — no reliance on old packages resolving.

## The one modification

`periphery/libraries/UniswapV2Library.sol` → `pairFor()` resolves the pair via
`IUniswapV2Factory(factory).getPair(token0, token1)` instead of the canonical
CREATE2 init-code-hash computation. The upstream hash is pinned to Uniswap's
**mainnet** `UniswapV2Pair` bytecode and would not match a locally compiled
pair; `getPair()` is bytecode-agnostic. Cost: one extra `SLOAD` per hop
(negligible on testnet) and `pairFor` becomes `view`.

External `@uniswap/*` imports were repointed to these local copies.
