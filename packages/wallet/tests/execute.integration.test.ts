// T-602 — Integration: a real mUSD/WMNT swap executed from the agent wallet on
// Mantle Sepolia, end-to-end through `executeOption` (policy → swap → DecisionLog).
// Skipped unless DEPLOYER_PRIVATE_KEY is set, so CI stays green; run locally:
//   set -a; . contracts/.env; set +a; bun test packages/wallet
import { test, expect } from 'bun:test';
import { parseUnits, type Hex } from 'viem';
import { addresses, getWalletClient, getPublicClient } from '@autonoe/chain';
import { executeOption, DEFAULT_POLICY } from '../src/index.js';

const KEY = process.env.DEPLOYER_PRIVATE_KEY as Hex | undefined;
const itLive = KEY ? test : test.skip;

const OWNER_MINT_ABI = [
  {
    type: 'function',
    name: 'ownerMint',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

itLive(
  'executeOption performs a real mUSD→WMNT swap + DecisionLog write',
  async () => {
    const pk = KEY!;
    const wc = getWalletClient(pk);
    const pc = getPublicClient();
    const me = wc.account!.address;

    // Fund the agent wallet with mUSD to open the position (deployer owns mUSD).
    const sizeMUSD = 5;
    const mintHash = await wc.writeContract({
      address: addresses.mUSD,
      abi: OWNER_MINT_ABI,
      functionName: 'ownerMint',
      args: [me, parseUnits(String(sizeMUSD), 6)],
      account: wc.account!,
    });
    await pc.waitForTransactionReceipt({ hash: mintHash });

    const res = await executeOption({
      privateKey: pk,
      option: { id: 'opt-1', direction: 'long', asset: 'WMNT', sizeMUSD },
      thesisHash: `0x${'aa'.repeat(32)}`,
      verdictHash: `0x${'bb'.repeat(32)}`,
      optionRef: 'opt-1',
      confirmed: true,
      policy: DEFAULT_POLICY,
    });

    expect(res.swap.txHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
    expect(BigInt(res.swap.amountOut)).toBeGreaterThan(0n);
    expect(res.decisionTxHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
  },
  180_000,
);
