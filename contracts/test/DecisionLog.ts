// Hardhat 3 node:test (viem) for DecisionLog. Run via `bun run test:hardhat`.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

const { viem } = await network.create();

// Sample decision payload (hashes are caller-computed off-chain).
const THESIS = `0x${"11".repeat(32)}` as const;
const VERDICT = `0x${"22".repeat(32)}` as const;
const ASSET = "0x000000000000000000000000000000000000dEaD" as const;

describe("DecisionLog", () => {
  it("logs a decision, emits the event, and stores it by id", async () => {
    const log = await viem.deployContract("DecisionLog");
    const [, alice] = await viem.getWalletClients();
    const publicClient = await viem.getPublicClient();

    const hash = await log.write.logDecision(
      [THESIS, VERDICT, ASSET, 1_000_000n, 950_000n, -50_000n, "opt-aggressive"],
      { account: alice.account },
    );
    await publicClient.waitForTransactionReceipt({ hash });

    assert.equal(await log.read.totalDecisions(), 1n);

    const d = await log.read.getDecision([0n]);
    assert.equal(d.user.toLowerCase(), alice.account.address.toLowerCase());
    assert.equal(d.thesisHash, THESIS);
    assert.equal(d.verdictHash, VERDICT);
    assert.equal(d.asset.toLowerCase(), ASSET.toLowerCase());
    assert.equal(d.amountIn, 1_000_000n);
    assert.equal(d.amountOut, 950_000n);
    assert.equal(d.pnl, -50_000n); // signed PnL round-trips
    assert.equal(d.optionRef, "opt-aggressive");
    assert.ok(d.timestamp > 0n);

    const events = await log.getEvents.DecisionLogged();
    assert.equal(events.length, 1);
    assert.equal(events[0]?.args.id, 0n);
    assert.equal(events[0]?.args.optionRef, "opt-aggressive");
  });

  it("keeps independent per-user histories", async () => {
    const log = await viem.deployContract("DecisionLog");
    const [, alice, bob] = await viem.getWalletClients();

    await log.write.logDecision(
      [THESIS, VERDICT, ASSET, 1n, 2n, 1n, "a1"],
      { account: alice.account },
    );
    await log.write.logDecision(
      [THESIS, VERDICT, ASSET, 3n, 4n, 1n, "b1"],
      { account: bob.account },
    );
    await log.write.logDecision(
      [THESIS, VERDICT, ASSET, 5n, 6n, -1n, "a2"],
      { account: alice.account },
    );

    assert.equal(await log.read.totalDecisions(), 3n);
    assert.equal(await log.read.getUserDecisionCount([alice.account.address]), 2n);
    assert.equal(await log.read.getUserDecisionCount([bob.account.address]), 1n);

    const aliceIds = await log.read.getUserDecisionIds([alice.account.address]);
    assert.deepEqual(aliceIds, [0n, 2n]);

    const aliceHistory = await log.read.getUserDecisions([alice.account.address]);
    assert.equal(aliceHistory.length, 2);
    assert.equal(aliceHistory[0]?.optionRef, "a1");
    assert.equal(aliceHistory[1]?.optionRef, "a2");
  });

  it("reverts reading an out-of-range id", async () => {
    const log = await viem.deployContract("DecisionLog");
    await assert.rejects(log.read.getDecision([0n]), /bad id/);
  });
});
