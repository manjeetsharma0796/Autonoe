// Integration test — executes a REAL swap + DecisionLog write on Mantle Sepolia.
// Skipped unless DEPLOYER_PRIVATE_KEY is set, so CI (no key) stays green; run
// locally with:  set -a; . contracts/.env; set +a; bun test packages/chain
import { test, expect } from 'bun:test';
import { parseUnits, type Hex } from 'viem';
import {
  addresses,
  getPublicClient,
  getWalletClient,
  getQuote,
  swap,
  writeDecision,
  readHistory,
} from './index.js';

const KEY = process.env.DEPLOYER_PRIVATE_KEY as Hex | undefined;
const itLive = KEY ? test : test.skip;

// mUSD is Ownable with an ownerMint — the deployer funds itself for the swap.
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
  'executes a real mUSD→WMNT swap on Mantle Sepolia',
  async () => {
    const pk = KEY!;
    const wc = getWalletClient(pk);
    const pc = getPublicClient();
    const me = wc.account!.address;

    const amountIn = parseUnits('50', 6); // 50 mUSD (6 decimals)
    const mintHash = await wc.writeContract({
      address: addresses.mUSD,
      abi: OWNER_MINT_ABI,
      functionName: 'ownerMint',
      args: [me, amountIn],
      account: wc.account!,
    });
    await pc.waitForTransactionReceipt({ hash: mintHash });

    const path = [addresses.mUSD, addresses.WMNT];
    const quote = await getQuote(amountIn, path);
    expect(quote.length).toBe(2);
    expect(quote[1]!).toBeGreaterThan(0n);

    const res = await swap({ privateKey: pk, amountIn, path });
    expect(res.amountOut).toBeGreaterThan(0n);
    expect(res.amountOut).toBeGreaterThanOrEqual(res.minOut);
  },
  180_000,
);

itLive(
  'writes and reads back a DecisionLog entry',
  async () => {
    const pk = KEY!;
    const me = getWalletClient(pk).account!.address;

    const before = (await readHistory(me)).length;
    await writeDecision({
      privateKey: pk,
      thesisHash: `0x${'11'.repeat(32)}`,
      verdictHash: `0x${'22'.repeat(32)}`,
      asset: addresses.WMNT,
      amountIn: parseUnits('50', 6),
      amountOut: 1n,
      pnl: -5n,
      optionRef: 'opt-1',
    });

    // The public RPC is load-balanced; a read right after the receipt can hit a
    // node a block behind, so poll until the new entry is visible.
    let after = await readHistory(me);
    for (let i = 0; i < 15 && after.length <= before; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      after = await readHistory(me);
    }
    expect(after.length).toBe(before + 1);
    expect(after[after.length - 1]!.optionRef).toBe('opt-1');
  },
  120_000,
);
