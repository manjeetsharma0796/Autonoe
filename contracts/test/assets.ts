// Hardhat 3 node:test (viem) for the asset tokens. Run via `bun run test:hardhat`.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

const { viem } = await network.create();

describe("WMNT", () => {
  it("is an 18-decimal wrapper named WMNT", async () => {
    const wmnt = await viem.deployContract("WMNT");
    assert.equal(await wmnt.read.name(), "Wrapped MNT");
    assert.equal(await wmnt.read.symbol(), "WMNT");
    assert.equal(await wmnt.read.decimals(), 18);
  });

  it("deposit() wraps native MNT 1:1 and backs totalSupply", async () => {
    const wmnt = await viem.deployContract("WMNT");
    const [, alice] = await viem.getWalletClients();
    const amount = 10n ** 18n; // 1 MNT

    await wmnt.write.deposit({ value: amount, account: alice.account });

    assert.equal(await wmnt.read.balanceOf([alice.account.address]), amount);
    assert.equal(await wmnt.read.totalSupply(), amount);
  });

  it("withdraw() burns WMNT and returns native MNT", async () => {
    const wmnt = await viem.deployContract("WMNT");
    const [, alice] = await viem.getWalletClients();
    const amount = 2n * 10n ** 18n;

    await wmnt.write.deposit({ value: amount, account: alice.account });
    await wmnt.write.withdraw([amount], { account: alice.account });

    assert.equal(await wmnt.read.balanceOf([alice.account.address]), 0n);
    assert.equal(await wmnt.read.totalSupply(), 0n);
  });

  it("receive() auto-wraps a plain native transfer", async () => {
    const wmnt = await viem.deployContract("WMNT");
    const [, alice] = await viem.getWalletClients();
    const amount = 5n * 10n ** 17n; // 0.5 MNT

    await alice.sendTransaction({ to: wmnt.address, value: amount });

    assert.equal(await wmnt.read.balanceOf([alice.account.address]), amount);
  });
});

describe("MockBTC / MockETH", () => {
  it("MockBTC is an 18-decimal mintable ERC-20", async () => {
    const btc = await viem.deployContract("MockBTC");
    const [, alice] = await viem.getWalletClients();

    assert.equal(await btc.read.name(), "Mock BTC");
    assert.equal(await btc.read.symbol(), "mBTC");
    assert.equal(await btc.read.decimals(), 18);

    const amount = 3n * 10n ** 18n;
    await btc.write.mint([alice.account.address, amount]);
    assert.equal(await btc.read.balanceOf([alice.account.address]), amount);
  });

  it("MockETH is an 18-decimal mintable ERC-20", async () => {
    const eth = await viem.deployContract("MockETH");
    const [, alice] = await viem.getWalletClients();

    assert.equal(await eth.read.symbol(), "mETH");
    assert.equal(await eth.read.decimals(), 18);

    const amount = 7n * 10n ** 18n;
    await eth.write.mint([alice.account.address, amount]);
    assert.equal(await eth.read.balanceOf([alice.account.address]), amount);
  });
});
