import { ethers, network } from "hardhat";
import { writeFileSync } from "fs";
import { resolve } from "path";

/**
 * Deploy + seed the full Autonoe on-chain layer (T-106), hybrid engine (PRD §8):
 *   - tokens: mUSD, WOKB
 *   - real AMM: AmmFactory + AmmRouter, seeded mUSD/WOKB pool
 *   - synthetic leg: PriceOracle (signed-pull) + SyntheticExchange (house reserve)
 *   - benchmark: DecisionLog
 * Then writes live addresses to packages/chain/addresses.json (T-107 also exports ABIs).
 *
 * Seed sizes are env-overridable so a small faucet drip suffices on testnet.
 * Native OKB is the ONLY real cost here: SEED_WOKB is wrapped into the pool and
 * everything else (mUSD, house reserve) is owner-minted for free. X Layer
 * testnet OKB is scarce, so the default pool seed is deliberately small.
 */
const SEED_WOKB = ethers.parseEther(process.env.SEED_WOKB || "0.02");
const SEED_MUSD = BigInt(process.env.SEED_MUSD_BASEUNITS || (10 * 1e6).toString()); // ~500 mUSD/OKB
const HOUSE_RESERVE = BigInt(process.env.HOUSE_RESERVE_BASEUNITS || (100_000 * 1e6).toString());
const MARKETS = (process.env.SYNTH_MARKETS || "BTC,ETH,SUI,SOL")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}  network: ${network.name}`);

  const signerKey = process.env.ORACLE_SIGNER_PRIVATE_KEY;
  const oracleSigner = signerKey ? new ethers.Wallet(signerKey).address : deployer.address;
  if (!signerKey) {
    console.warn("⚠ ORACLE_SIGNER_PRIVATE_KEY not set — using deployer as oracle signer (dev only).");
  }

  // ── deploy ────────────────────────────────────────────────────────────────
  const musd = await (await ethers.getContractFactory("MUSD")).deploy();
  const wokb = await (await ethers.getContractFactory("WOKB")).deploy();
  const factory = await (await ethers.getContractFactory("AmmFactory")).deploy();
  const router = await (await ethers.getContractFactory("AmmRouter")).deploy(await factory.getAddress());
  const decisionLog = await (await ethers.getContractFactory("DecisionLog")).deploy();
  const oracle = await (await ethers.getContractFactory("PriceOracle")).deploy(oracleSigner);
  const exchange = await (
    await ethers.getContractFactory("SyntheticExchange")
  ).deploy(await musd.getAddress(), await oracle.getAddress());

  for (const c of [musd, wokb, factory, router, decisionLog, oracle, exchange]) {
    await c.waitForDeployment();
  }

  const musdAddr = await musd.getAddress();
  const wokbAddr = await wokb.getAddress();
  const routerAddr = await router.getAddress();

  // ── seed the real mUSD/WOKB pool ───────────────────────────────────────────
  await (await musd.ownerMint(deployer.address, SEED_MUSD + HOUSE_RESERVE)).wait();
  await (await wokb.deposit({ value: SEED_WOKB })).wait();
  await (await musd.approve(routerAddr, SEED_MUSD)).wait();
  await (await wokb.approve(routerAddr, SEED_WOKB)).wait();
  const deadline = Math.floor(Date.now() / 1000) + 3600;
  await (
    await router.addLiquidity(musdAddr, wokbAddr, SEED_MUSD, SEED_WOKB, 0, 0, deployer.address, deadline)
  ).wait();

  // X Layer's RPC can serve a pre-tx view for a moment after the receipt lands,
  // so a bare read here returned the zero address and wrote it into the manifest.
  // Poll until the factory reports the pair it just created.
  const pair = await (async () => {
    for (let i = 0; i < 20; i++) {
      const p = await factory.getPair(musdAddr, wokbAddr);
      if (p !== ethers.ZeroAddress) return p;
      await new Promise((r) => setTimeout(r, 1500));
    }
    throw new Error("pair not visible after addLiquidity — refusing to write a zero address");
  })();

  // ── fund the synthetic house reserve ───────────────────────────────────────
  await (await musd.approve(await exchange.getAddress(), HOUSE_RESERVE)).wait();
  await (await exchange.fundReserve(HOUSE_RESERVE)).wait();

  // ── register synthetic markets ─────────────────────────────────────────────
  for (const m of MARKETS) await (await exchange.registerMarket(m)).wait();

  // ── export addresses ───────────────────────────────────────────────────────
  const out = {
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    mUSD: musdAddr,
    WOKB: wokbAddr,
    factory: await factory.getAddress(),
    router: routerAddr,
    decisionLog: await decisionLog.getAddress(),
    oracle: await oracle.getAddress(),
    syntheticExchange: await exchange.getAddress(),
    oracleSigner,
    pools: { mUSD_WOKB: pair },
    syntheticMarkets: MARKETS,
  };

  console.log("\nDeployed addresses:\n" + JSON.stringify(out, null, 2));

  const dest = resolve(__dirname, "../../packages/chain/addresses.json");
  writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
  console.log(`\n✔ Wrote ${dest}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
