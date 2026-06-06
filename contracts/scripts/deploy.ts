// T-106 — Deploy + seed script.
//
// Deploys the full on-chain stack, creates + seeds the mUSD/WMNT pair, and
// prints every address:
//   • mUSD (6-dec stablecoin)            • WMNT / MockBTC / MockETH (18-dec)
//   • UniswapV2Factory + Router02        • DecisionLog
//
// Defaults to the in-process `hardhat` EDR network so it can be validated with
// no key (`bun run deploy`). For the live deploy (T-107) set
// `DEPLOY_NETWORK=mantleSepolia` plus `DEPLOYER_PRIVATE_KEY` + `MANTLE_SEPOLIA_RPC`,
// and run `bun run deploy:testnet`. Seed sizes are overridable via
// `SEED_MUSD` / `SEED_WMNT` (whole-token units) — defaults stay faucet-friendly.

import { network } from "hardhat";

const MUSD = 10n ** 6n; // mUSD has 6 decimals
const ETH = 10n ** 18n; // WMNT and the mock assets have 18

// ~0.5 mUSD per WMNT (matches live MNT price); 4 WMNT is cheap to fund.
const SEED_MUSD = BigInt(process.env.SEED_MUSD ?? "2000") * MUSD;
const SEED_WMNT = BigInt(process.env.SEED_WMNT ?? "4") * ETH;

const ZERO = "0x0000000000000000000000000000000000000000";

async function main() {
  const networkName = process.env.DEPLOY_NETWORK ?? "hardhat";
  const { viem } = await network.connect(networkName);
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();
  const owner = deployer.account.address;

  console.log(`\n▶ Deploying Autonoe contracts to "${networkName}" as ${owner}\n`);

  // ── tokens ──────────────────────────────────────────────────────────────
  const musd = await viem.deployContract("mUSD");
  const wmnt = await viem.deployContract("WMNT");
  const mbtc = await viem.deployContract("MockBTC");
  const meth = await viem.deployContract("MockETH");

  // ── DEX (WMNT is this fork's WETH) ──────────────────────────────────────
  const factory = await viem.deployContract("UniswapV2Factory", [owner]);
  const router = await viem.deployContract("UniswapV2Router02", [
    factory.address,
    wmnt.address,
  ]);

  // ── on-chain decision ledger ────────────────────────────────────────────
  const decisionLog = await viem.deployContract("DecisionLog");

  // ── create + seed the mUSD/WMNT pair ────────────────────────────────────
  await factory.write.createPair([musd.address, wmnt.address]);

  await musd.write.ownerMint([owner, SEED_MUSD]); // deployer is the mUSD owner
  await wmnt.write.deposit({ value: SEED_WMNT }); // wrap native MNT 1:1
  await musd.write.approve([router.address, SEED_MUSD]);
  await wmnt.write.approve([router.address, SEED_WMNT]);

  const block = await publicClient.getBlock();
  await router.write.addLiquidity([
    musd.address,
    wmnt.address,
    SEED_MUSD,
    SEED_WMNT,
    0n,
    0n,
    owner,
    block.timestamp + 3600n,
  ]);

  // viem's hardhat helper types contract reads dynamically; pin the signature.
  const getPair = factory.read.getPair as (
    args: [`0x${string}`, `0x${string}`],
  ) => Promise<`0x${string}`>;
  const pair = await getPair([musd.address, wmnt.address]);
  // addLiquidity above reverts if seeding fails, so a non-zero pair address is
  // sufficient confirmation that the pool exists and holds reserves.
  if (pair === ZERO) throw new Error("mUSD/WMNT pair was not created");

  const addresses = {
    network: networkName,
    chainId: await publicClient.getChainId(),
    mUSD: musd.address,
    WMNT: wmnt.address,
    MockBTC: mbtc.address,
    MockETH: meth.address,
    UniswapV2Factory: factory.address,
    UniswapV2Router02: router.address,
    DecisionLog: decisionLog.address,
    "pair:mUSD/WMNT": pair,
  };

  console.log("✓ Deployed + seeded mUSD/WMNT. Addresses:\n");
  console.table(addresses);
  // Machine-readable block (T-107 lifts these into packages/chain/addresses.json).
  console.log("\n" + JSON.stringify(addresses, null, 2) + "\n");

  return addresses;
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
