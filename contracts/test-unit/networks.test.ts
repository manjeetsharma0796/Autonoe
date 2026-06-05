// CI smoke test (runs under `bun test`). Verifies the frozen network constants
// the Hardhat config and downstream tracks (deploy/seed T-106, viem lib T-108)
// depend on — without invoking Hardhat, so it stays fast and offline. Real
// on-chain / contract tests arrive with the contracts in T-102+.
import { expect, test } from "bun:test";

import {
  DEFAULT_MANTLE_SEPOLIA_RPC,
  ENV,
  MANTLE_SEPOLIA_CHAIN_ID,
} from "../config/networks.js";

test("targets Mantle Sepolia (chain 5003)", () => {
  expect(MANTLE_SEPOLIA_CHAIN_ID).toBe(5003);
});

test("defaults to the public Mantle Sepolia RPC", () => {
  expect(DEFAULT_MANTLE_SEPOLIA_RPC).toBe("https://rpc.sepolia.mantle.xyz");
});

test("resolves config from the documented env vars", () => {
  expect(ENV.rpc).toBe("MANTLE_SEPOLIA_RPC");
  expect(ENV.deployerKey).toBe("DEPLOYER_PRIVATE_KEY");
});
