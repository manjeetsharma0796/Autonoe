// T-107 — Deploy the full stack + record addresses & ABIs.
//
// Deploys mUSD + asset tokens + the Uniswap V2 fork + DecisionLog, creates and
// seeds all three mUSD pools, then writes the live addresses to
// `packages/chain/addresses.json` and each contract's ABI to
// `packages/chain/abis/`. This is the production deploy that the off-chain
// tracks build against (the modular T-106/T-109 scripts stay for re-seeding).
//
// Local dry run (no key): `bun run deploy:all`
// Live Mantle Sepolia:     `bun run deploy:all:testnet`  (needs contracts/.env)

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { network } from "hardhat";

const MUSD = 10n ** 6n; // mUSD: 6 decimals
const ETH = 10n ** 18n; // WMNT + mock assets: 18 decimals
const ZERO = "0x0000000000000000000000000000000000000000";
type Hex = `0x${string}`;

// Seed ratios ≈ live spot; modest so a faucet balance covers the WMNT wrap.
const SEED = {
  wmntMUSD: BigInt(process.env.SEED_MUSD ?? "2000") * MUSD,
  wmnt: BigInt(process.env.SEED_WMNT ?? "4") * ETH,
  btcMUSD: BigInt(process.env.SEED_BTC_MUSD ?? "6400") * MUSD,
  btc: (BigInt(process.env.SEED_BTC_MILLI ?? "100") * ETH) / 1000n, // 0.1 mBTC
  ethMUSD: BigInt(process.env.SEED_ETH_MUSD ?? "3488") * MUSD,
  eth: BigInt(process.env.SEED_ETH ?? "1") * ETH,
};

async function main() {
  const networkName = process.env.DEPLOY_NETWORK ?? "hardhat";
  const { viem } = await network.connect(networkName);
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();
  const owner = deployer.account.address;
  const chainId = await publicClient.getChainId();

  console.log(`\n▶ Deploying full stack to "${networkName}" (chain ${chainId}) as ${owner}\n`);

  // ── deploy ────────────────────────────────────────────────────────────────
  const musd = await viem.deployContract("mUSD");
  const wmnt = await viem.deployContract("WMNT");
  const mbtc = await viem.deployContract("MockBTC");
  const meth = await viem.deployContract("MockETH");
  const factory = await viem.deployContract("UniswapV2Factory", [owner]);
  const router = await viem.deployContract("UniswapV2Router02", [factory.address, wmnt.address]);
  const decisionLog = await viem.deployContract("DecisionLog");

  const getPair = factory.read.getPair as (args: [Hex, Hex]) => Promise<Hex>;
  const block = await publicClient.getBlock();
  const deadline = block.timestamp + 3600n;

  // Wait for each write to confirm before sending the next. On real networks,
  // firing unconfirmed txs back-to-back races the nonce and overwhelms public
  // RPCs ("unexpected status code"); serializing on receipts keeps it reliable.
  const tx = async (hash: Promise<Hex>) =>
    publicClient.waitForTransactionReceipt({ hash: await hash });

  // ── seed mUSD/WMNT (wrap native MNT for the WMNT side) ──────────────────────
  await tx(factory.write.createPair([musd.address, wmnt.address]));
  await tx(musd.write.ownerMint([owner, SEED.wmntMUSD]));
  await tx(wmnt.write.deposit({ value: SEED.wmnt }));
  await tx(musd.write.approve([router.address, SEED.wmntMUSD]));
  await tx(wmnt.write.approve([router.address, SEED.wmnt]));
  await tx(
    router.write.addLiquidity([
      musd.address, wmnt.address, SEED.wmntMUSD, SEED.wmnt, 0n, 0n, owner, deadline,
    ]),
  );

  // ── seed mUSD/<mock> pools (mint the mock side) ─────────────────────────────
  async function seedMock(asset: typeof mbtc, musdAmt: bigint, assetAmt: bigint) {
    await tx(factory.write.createPair([musd.address, asset.address]));
    await tx(musd.write.ownerMint([owner, musdAmt]));
    await tx(asset.write.mint([owner, assetAmt]));
    await tx(musd.write.approve([router.address, musdAmt]));
    await tx(asset.write.approve([router.address, assetAmt]));
    await tx(
      router.write.addLiquidity([
        musd.address, asset.address, musdAmt, assetAmt, 0n, 0n, owner, deadline,
      ]),
    );
  }
  await seedMock(mbtc, SEED.btcMUSD, SEED.btc);
  await seedMock(meth, SEED.ethMUSD, SEED.eth);

  const poolWMNT = await getPair([musd.address, wmnt.address]);
  const poolBTC = await getPair([musd.address, mbtc.address]);
  const poolETH = await getPair([musd.address, meth.address]);
  for (const [k, v] of Object.entries({ poolWMNT, poolBTC, poolETH })) {
    if (v === ZERO) throw new Error(`${k} was not created`);
  }

  // ── write addresses.json ────────────────────────────────────────────────────
  const addresses = {
    chainId,
    deployedBy: owner,
    mUSD: musd.address,
    WMNT: wmnt.address,
    MockBTC: mbtc.address,
    MockETH: meth.address,
    factory: factory.address,
    router: router.address,
    decisionLog: decisionLog.address,
    pools: {
      mUSD_WMNT: poolWMNT,
      mUSD_MockBTC: poolBTC,
      mUSD_MockETH: poolETH,
    },
  };
  const chainDir = resolve(process.cwd(), "..", "packages", "chain");
  writeFileSync(resolve(chainDir, "addresses.json"), JSON.stringify(addresses, null, 2) + "\n");

  // ── write ABIs ──────────────────────────────────────────────────────────────
  const pair = await viem.getContractAt("UniswapV2Pair", poolWMNT);
  const abis: Record<string, unknown> = {
    mUSD: musd.abi,
    WMNT: wmnt.abi,
    MockBTC: mbtc.abi,
    MockETH: meth.abi,
    UniswapV2Factory: factory.abi,
    UniswapV2Router02: router.abi,
    UniswapV2Pair: pair.abi,
    DecisionLog: decisionLog.abi,
  };
  const abisDir = resolve(chainDir, "abis");
  mkdirSync(abisDir, { recursive: true });
  for (const [name, abi] of Object.entries(abis)) {
    writeFileSync(resolve(abisDir, `${name}.json`), JSON.stringify(abi, null, 2) + "\n");
  }

  console.log("✓ Deployed + seeded all pools. Wrote packages/chain/addresses.json + abis/.\n");
  console.table(addresses);
  console.log("\n" + JSON.stringify(addresses, null, 2) + "\n");
  return addresses;
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
