// T-109 — Extra pools (stretch).
//
// Creates + seeds the secondary pairs mUSD/MockBTC and mUSD/MockETH so the app
// has more than the primary mUSD/WMNT market. Mirrors deploy.ts (T-106).
//
// Self-contained: defaults to the in-process `hardhat` EDR network and deploys a
// fresh token/DEX set so it can be validated with no key (`bun run seed:extra`).
// For a live run after T-107, pass the already-deployed addresses via env
// (MUSD_ADDR / MOCKBTC_ADDR / MOCKETH_ADDR / FACTORY_ADDR / ROUTER_ADDR) and set
// DEPLOY_NETWORK=mantleSepolia + DEPLOYER_PRIVATE_KEY + MANTLE_SEPOLIA_RPC.

import { network } from "hardhat";

const MUSD = 10n ** 6n; // mUSD has 6 decimals
const ETH = 10n ** 18n; // mock assets have 18

// Seed ratios ≈ live spot (BTC ~64k, ETH ~3.5k mUSD); overridable per side.
const SEED = {
  btcMUSD: BigInt(process.env.SEED_BTC_MUSD ?? "6400") * MUSD,
  btc: (BigInt(process.env.SEED_BTC_MILLI ?? "100") * ETH) / 1000n, // 0.1 mBTC
  ethMUSD: BigInt(process.env.SEED_ETH_MUSD ?? "3488") * MUSD,
  eth: BigInt(process.env.SEED_ETH ?? "1") * ETH,
};

const ZERO = "0x0000000000000000000000000000000000000000";
type Hex = `0x${string}`;

async function main() {
  const networkName = process.env.DEPLOY_NETWORK ?? "hardhat";
  const { viem } = await network.connect(networkName);
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();
  const owner = deployer.account.address;

  console.log(`\n▶ Seeding extra pools on "${networkName}" as ${owner}\n`);

  // Use existing addresses when provided; otherwise deploy a fresh set so the
  // script is runnable standalone (local validation / fresh testnet).
  const reuse = Boolean(process.env.MUSD_ADDR);
  const musd = reuse
    ? await viem.getContractAt("mUSD", process.env.MUSD_ADDR as Hex)
    : await viem.deployContract("mUSD");
  const mbtc = reuse
    ? await viem.getContractAt("MockBTC", process.env.MOCKBTC_ADDR as Hex)
    : await viem.deployContract("MockBTC");
  const meth = reuse
    ? await viem.getContractAt("MockETH", process.env.MOCKETH_ADDR as Hex)
    : await viem.deployContract("MockETH");
  const wmnt = reuse ? null : await viem.deployContract("WMNT");
  const factory = reuse
    ? await viem.getContractAt("UniswapV2Factory", process.env.FACTORY_ADDR as Hex)
    : await viem.deployContract("UniswapV2Factory", [owner]);
  const router = reuse
    ? await viem.getContractAt("UniswapV2Router02", process.env.ROUTER_ADDR as Hex)
    : await viem.deployContract("UniswapV2Router02", [
        factory.address,
        wmnt!.address,
      ]);

  const getPair = factory.read.getPair as (
    args: [Hex, Hex],
  ) => Promise<Hex>;

  const block = await publicClient.getBlock();
  const deadline = block.timestamp + 3600n;

  // Seed one mUSD/<asset> pool: mint both sides, approve, addLiquidity.
  async function seedPool(
    asset: typeof mbtc,
    label: string,
    musdAmount: bigint,
    assetAmount: bigint,
  ) {
    await factory.write.createPair([musd.address, asset.address]);
    await musd.write.ownerMint([owner, musdAmount]);
    await asset.write.mint([owner, assetAmount]); // mocks have an open mint()
    await musd.write.approve([router.address, musdAmount]);
    await asset.write.approve([router.address, assetAmount]);
    await router.write.addLiquidity([
      musd.address,
      asset.address,
      musdAmount,
      assetAmount,
      0n,
      0n,
      owner,
      deadline,
    ]);
    const pair = await getPair([musd.address, asset.address]);
    if (pair === ZERO) throw new Error(`${label} pair was not created`);
    return pair;
  }

  const btcPair = await seedPool(mbtc, "mUSD/MockBTC", SEED.btcMUSD, SEED.btc);
  const ethPair = await seedPool(meth, "mUSD/MockETH", SEED.ethMUSD, SEED.eth);

  const result = {
    network: networkName,
    chainId: await publicClient.getChainId(),
    mUSD: musd.address,
    MockBTC: mbtc.address,
    MockETH: meth.address,
    "pair:mUSD/MockBTC": btcPair,
    "pair:mUSD/MockETH": ethPair,
  };

  console.log("✓ Seeded extra pools:\n");
  console.table(result);
  console.log("\n" + JSON.stringify(result, null, 2) + "\n");

  return result;
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
