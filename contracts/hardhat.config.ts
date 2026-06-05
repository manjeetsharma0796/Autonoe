import { configVariable, defineConfig } from "hardhat/config";
import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";

import {
  DEFAULT_MANTLE_SEPOLIA_RPC,
  ENV,
  MANTLE_SEPOLIA_CHAIN_ID,
} from "./config/networks.js";

// Autonoe contracts — Hardhat 3 (ESM, viem). Track 1 home for mUSD, the asset
// tokens, the Uniswap V2 fork, and DecisionLog (T-102+). Targets Mantle Sepolia
// (chain 5003); see PRD.md §10/§12 and packages/chain/src/network.ts.
//
// `configVariable` is resolved lazily — only when a task actually connects to
// `mantleSepolia` — so `npx hardhat compile` and local edr tests work without a
// deployer key set. Fill DEPLOYER_PRIVATE_KEY + MANTLE_SEPOLIA_RPC (.env) before
// deploying. Use a throwaway testnet account funded from the faucet.
export default defineConfig({
  plugins: [hardhatToolboxViem],
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    // In-memory EDR chain for unit tests (`network.create()` in node:test).
    hardhat: {
      type: "edr-simulated",
      chainId: MANTLE_SEPOLIA_CHAIN_ID,
    },
    // Live Mantle Sepolia — used by deploy/seed scripts (T-106) and the
    // testnet integration tests (T-108).
    mantleSepolia: {
      type: "http",
      chainId: MANTLE_SEPOLIA_CHAIN_ID,
      url: process.env[ENV.rpc] ?? DEFAULT_MANTLE_SEPOLIA_RPC,
      accounts: [configVariable(ENV.deployerKey)],
    },
  },
});
