// Hardhat 3 node:test (viem) for the Uniswap V2 fork (T-104). Deploys the
// canonical core (factory/pair, solc 0.5.16) + periphery router (0.6.6) with
// WMNT as WETH, creates the mUSD/WMNT pair, seeds liquidity, and quotes a swap.
// Run via `bun run test:hardhat`.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

const { viem } = await network.create();

const MUSD = 10n ** 6n; // mUSD has 6 decimals
const ETH = 10n ** 18n; // WMNT has 18 decimals

async function deployDex() {
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  const musd = await viem.deployContract("mUSD");
  const wmnt = await viem.deployContract("WMNT");
  const factory = await viem.deployContract("UniswapV2Factory", [
    deployer.account.address, // feeToSetter
  ]);
  const router = await viem.deployContract("UniswapV2Router02", [
    factory.address,
    wmnt.address, // WMNT is this fork's WETH
  ]);

  return { deployer, publicClient, musd, wmnt, factory, router };
}

describe("Uniswap V2 fork", () => {
  it("createPair registers the mUSD/WMNT pair", async () => {
    const { musd, wmnt, factory } = await deployDex();

    await factory.write.createPair([musd.address, wmnt.address]);

    const pair = await factory.read.getPair([musd.address, wmnt.address]);
    assert.notEqual(pair, "0x0000000000000000000000000000000000000000");
    assert.equal(await factory.read.allPairsLength(), 1n);
    // Idempotent registry: reverse order resolves to the same pair.
    assert.equal(
      await factory.read.getPair([wmnt.address, musd.address]),
      pair,
    );
  });

  it("seeds liquidity and quotes a swap through the router", async () => {
    const { deployer, publicClient, musd, wmnt, factory, router } =
      await deployDex();

    const amountMUSD = 2_000n * MUSD; // 2,000 mUSD
    const amountWMNT = 1n * ETH; // 1 WMNT  → ~2,000 mUSD/WMNT

    // Acquire both tokens: mint mUSD (deployer is owner), wrap MNT for WMNT.
    await musd.write.ownerMint([deployer.account.address, amountMUSD]);
    await wmnt.write.deposit({ value: amountWMNT });

    // Approve the router to pull both.
    await musd.write.approve([router.address, amountMUSD]);
    await wmnt.write.approve([router.address, amountWMNT]);

    const block = await publicClient.getBlock();
    const deadline = block.timestamp + 3600n;

    await router.write.addLiquidity([
      musd.address,
      wmnt.address,
      amountMUSD,
      amountWMNT,
      0n,
      0n,
      deployer.account.address,
      deadline,
    ]);

    // Pair now holds the reserves.
    const pairAddr = await factory.read.getPair([musd.address, wmnt.address]);
    const pair = await viem.getContractAt("UniswapV2Pair", pairAddr);
    const [r0, r1] = await pair.read.getReserves();
    assert.ok(r0 > 0n && r1 > 0n, "reserves seeded");

    // Quote: 100 mUSD in → some WMNT out, less than spot (fee + slippage).
    const amountIn = 100n * MUSD;
    const amounts = await router.read.getAmountsOut([
      amountIn,
      [musd.address, wmnt.address],
    ]);
    assert.equal(amounts.length, 2);
    assert.equal(amounts[0], amountIn);
    assert.ok(amounts[1]! > 0n, "non-zero WMNT out");
    // Spot for 100 mUSD ≈ 0.05 WMNT; with the 0.3% fee the quote is just under.
    assert.ok(amounts[1]! < 5n * 10n ** 16n, "below spot price");
  });
});
