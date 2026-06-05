// Single source of truth for the chain constants the Hardhat config and the
// contracts test suite share. Mirrors `packages/chain/src/network.ts` (chain
// 5003, Mantle Sepolia) so the deploy/seed scripts (T-106+) and the viem lib
// (T-108) agree on the same network. No secrets live here — the RPC and the
// deployer key are read lazily from env via `configVariable` in the config.

/** Mantle Sepolia chain id. Frozen across all tracks. */
export const MANTLE_SEPOLIA_CHAIN_ID = 5003 as const;

/** Public Mantle Sepolia RPC; overridable via the `MANTLE_SEPOLIA_RPC` env. */
export const DEFAULT_MANTLE_SEPOLIA_RPC = "https://rpc.sepolia.mantle.xyz";

/** Env var names the Hardhat config resolves (kept here so tests can assert). */
export const ENV = {
  rpc: "MANTLE_SEPOLIA_RPC",
  deployerKey: "DEPLOYER_PRIVATE_KEY",
  treasuryKey: "TREASURY_PRIVATE_KEY",
} as const;
