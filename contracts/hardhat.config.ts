import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

// Shared root env (provider keys, RPC, deployer/oracle keys). .env.local overrides .env.
dotenv.config({ path: "../.env" });
dotenv.config({ path: "../.env.local", override: true });

const RPC = process.env.XLAYER_RPC_URL || "https://testrpc.xlayer.tech";
// Accept keys with or without the 0x prefix.
const norm = (k?: string) => (k ? (k.startsWith("0x") ? k : `0x${k}`) : undefined);
const DEPLOYER = norm(process.env.DEPLOYER_PRIVATE_KEY);

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // IR pipeline avoids "stack too deep" in the Router's addLiquidity.
      viaIR: true,
      // X Layer is a Polygon-CDK zkEVM — pin to paris (no PUSH0/cancun opcodes),
      // which zkEVM bytecode support requires.
      evmVersion: "paris",
    },
  },
  networks: {
    // Local in-process network for tests.
    hardhat: {},
    // X Layer testnet (chain 1952) — the OKX settlement chain the arena already
    // anchors to. Accounts only present if a deployer key is set.
    xlayerTestnet: {
      url: RPC,
      chainId: 1952,
      accounts: DEPLOYER ? [DEPLOYER] : [],
    },
  },
  // Keyless source verification via Sourcify.
  sourcify: {
    enabled: true,
  },
};

export default config;
