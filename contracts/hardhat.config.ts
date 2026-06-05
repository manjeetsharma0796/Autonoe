import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

// Shared root .env (provider keys, RPC, deployer/treasury/oracle keys).
dotenv.config({ path: "../.env" });

const RPC = process.env.MANTLE_SEPOLIA_RPC || "https://rpc.sepolia.mantle.xyz";
const DEPLOYER = process.env.DEPLOYER_PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // IR pipeline avoids "stack too deep" in the Router's addLiquidity.
      viaIR: true,
      // Mantle is an L2 — pin to paris (no PUSH0/cancun opcodes) for deploy safety.
      evmVersion: "paris",
    },
  },
  networks: {
    // Local in-process network for tests.
    hardhat: {},
    // Mantle Sepolia (chain 5003) — PRD §9. Accounts only present if a key is set.
    mantleSepolia: {
      url: RPC,
      chainId: 5003,
      accounts: DEPLOYER ? [DEPLOYER] : [],
    },
  },
  etherscan: {
    apiKey: { mantleSepolia: process.env.MANTLESCAN_API_KEY || "no-key-needed" },
    customChains: [
      {
        network: "mantleSepolia",
        chainId: 5003,
        urls: {
          apiURL: "https://api-sepolia.mantlescan.xyz/api",
          browserURL: "https://sepolia.mantlescan.xyz",
        },
      },
    ],
  },
};

export default config;
