import { describe, expect, test } from 'bun:test';
import type { Address, Hex } from 'viem';
import { addresses } from '@autonoe/chain';
import type { SwapResult as ChainSwapResult, SwapParams, DecisionInput } from '@autonoe/chain';
import type { SpendingPolicy } from '../src/policy.ts';
import {
  scaleToBaseUnits,
  buildSwapPlan,
  executeOption,
  type ExecuteOptionInput,
  type ExecuteDeps,
} from '../src/execute.ts';

// ── shared test fixtures ──────────────────────────────────────────────────────

const FAKE_PRIVATE_KEY =
  '0x0000000000000000000000000000000000000000000000000000000000000001' as Hex;

const FAKE_SWAP_TX_HASH =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Hex;

const FAKE_APPROVE_TX_HASH =
  '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as Hex;

const FAKE_DECISION_TX_HASH =
  '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc' as Hex;

const FAKE_THESIS_HASH =
  '0x1111111111111111111111111111111111111111111111111111111111111111' as Hex;

const FAKE_VERDICT_HASH =
  '0x2222222222222222222222222222222222222222222222222222222222222222' as Hex;

const AMOUNT_IN = 100_000_000n; // 100 mUSD (6 dec)
const AMOUNT_OUT = 50_000_000_000_000_000_000n; // 50 WMNT (18 dec)

const CANNED_SWAP_RESULT: ChainSwapResult = {
  approveTxHash: FAKE_APPROVE_TX_HASH,
  swapTxHash: FAKE_SWAP_TX_HASH,
  amountIn: AMOUNT_IN,
  expectedOut: AMOUNT_OUT,
  minOut: AMOUNT_OUT - (AMOUNT_OUT * 50n) / 10_000n,
  amountOut: AMOUNT_OUT,
};

const SAMPLE_POLICY: SpendingPolicy = {
  maxTradeMUSD: 1000,
  allowedTokens: ['WMNT', 'MockBTC', 'MockETH'],
};

// ── helper: make injectable deps with call recorders ─────────────────────────

function makeDeps(opts?: {
  swapResult?: ChainSwapResult;
  decisionTxHash?: Hex;
}): {
  deps: ExecuteDeps;
  swapCalls: SwapParams[];
  decisionCalls: DecisionInput[];
} {
  const swapCalls: SwapParams[] = [];
  const decisionCalls: DecisionInput[] = [];

  const deps: ExecuteDeps = {
    addresses,
    swapFn: async (p: SwapParams) => {
      swapCalls.push(p);
      return opts?.swapResult ?? CANNED_SWAP_RESULT;
    },
    writeDecisionFn: async (i: DecisionInput) => {
      decisionCalls.push(i);
      return { txHash: opts?.decisionTxHash ?? FAKE_DECISION_TX_HASH };
    },
  };

  return { deps, swapCalls, decisionCalls };
}

// ── scaleToBaseUnits ──────────────────────────────────────────────────────────

describe('scaleToBaseUnits', () => {
  test('1000 mUSD at 6 decimals → 1_000_000_000n', () => {
    expect(scaleToBaseUnits(1000, 6n)).toBe(1_000_000_000n);
  });

  test('1 at 18 decimals → 1_000_000_000_000_000_000n', () => {
    expect(scaleToBaseUnits(1, 18n)).toBe(1_000_000_000_000_000_000n);
  });

  test('0.5 at 6 decimals → 500_000n', () => {
    expect(scaleToBaseUnits(0.5, 6n)).toBe(500_000n);
  });

  test('floors fractional results', () => {
    // 1.999 * 1e6 = 1_999_000, already whole; 1.0001 * 1e3 = 1000.1 → 1000
    expect(scaleToBaseUnits(1.0001, 3n)).toBe(1000n);
  });
});

// ── buildSwapPlan ─────────────────────────────────────────────────────────────

describe('buildSwapPlan', () => {
  test('long: path is [mUSD, WMNT], amountIn uses mUSD decimals', () => {
    const plan = buildSwapPlan({ direction: 'long', asset: 'WMNT', sizeMUSD: 100 }, addresses);
    expect(plan.path).toEqual([addresses.mUSD, addresses.WMNT]);
    expect(plan.amountIn).toBe(scaleToBaseUnits(100, 6n));
    expect(plan.assetAddress).toBe(addresses.WMNT);
  });

  test('hold: same path as long', () => {
    const plan = buildSwapPlan({ direction: 'hold', asset: 'MockBTC', sizeMUSD: 50 }, addresses);
    expect(plan.path).toEqual([addresses.mUSD, addresses.MockBTC]);
    expect(plan.amountIn).toBe(scaleToBaseUnits(50, 6n));
  });

  test('hedge: same path as long', () => {
    const plan = buildSwapPlan({ direction: 'hedge', asset: 'MockETH', sizeMUSD: 200 }, addresses);
    expect(plan.path).toEqual([addresses.mUSD, addresses.MockETH]);
  });

  test('short: path is [WMNT, mUSD], amountIn uses asset decimals (18)', () => {
    const plan = buildSwapPlan({ direction: 'short', asset: 'WMNT', sizeMUSD: 100 }, addresses);
    expect(plan.path).toEqual([addresses.WMNT, addresses.mUSD]);
    expect(plan.amountIn).toBe(scaleToBaseUnits(100, 18n));
    expect(plan.assetAddress).toBe(addresses.WMNT);
  });
});

// ── manual-confirm guard ──────────────────────────────────────────────────────

describe('executeOption — manual-confirm guard', () => {
  test('throws and never calls swapFn when confirmed is false', async () => {
    const { deps, swapCalls } = makeDeps();

    const input: ExecuteOptionInput = {
      privateKey: FAKE_PRIVATE_KEY,
      option: { direction: 'long', asset: 'WMNT', sizeMUSD: 100 },
      thesisHash: FAKE_THESIS_HASH,
      verdictHash: FAKE_VERDICT_HASH,
      optionRef: 'opt-1',
      confirmed: false,
      policy: SAMPLE_POLICY,
    };

    await expect(executeOption(input, deps)).rejects.toThrow(/manual-confirm/i);
    expect(swapCalls).toHaveLength(0);
  });
});

// ── policy guards ─────────────────────────────────────────────────────────────

describe('executeOption — spending policy', () => {
  test('throws and never calls swapFn when sizeMUSD exceeds maxTradeMUSD', async () => {
    const { deps, swapCalls } = makeDeps();

    const input: ExecuteOptionInput = {
      privateKey: FAKE_PRIVATE_KEY,
      option: { direction: 'long', asset: 'WMNT', sizeMUSD: 2000 }, // over 1000 cap
      thesisHash: FAKE_THESIS_HASH,
      verdictHash: FAKE_VERDICT_HASH,
      optionRef: 'opt-1',
      confirmed: true,
      policy: SAMPLE_POLICY,
    };

    await expect(executeOption(input, deps)).rejects.toThrow(/exceed|limit/i);
    expect(swapCalls).toHaveLength(0);
  });

  test('throws and never calls swapFn when asset is not in allowedTokens', async () => {
    const { deps, swapCalls } = makeDeps();

    const restrictedPolicy: SpendingPolicy = {
      maxTradeMUSD: 1000,
      allowedTokens: ['MockBTC'], // WMNT explicitly excluded
    };

    const input: ExecuteOptionInput = {
      privateKey: FAKE_PRIVATE_KEY,
      option: { direction: 'long', asset: 'WMNT', sizeMUSD: 100 },
      thesisHash: FAKE_THESIS_HASH,
      verdictHash: FAKE_VERDICT_HASH,
      optionRef: 'opt-1',
      confirmed: true,
      policy: restrictedPolicy,
    };

    await expect(executeOption(input, deps)).rejects.toThrow(/allow-list|not in/i);
    expect(swapCalls).toHaveLength(0);
  });
});

// ── happy path: long ──────────────────────────────────────────────────────────

describe('executeOption — happy path long', () => {
  test('calls swapFn with correct path + amountIn, then writeDecisionFn, returns SwapResult', async () => {
    const { deps, swapCalls, decisionCalls } = makeDeps();

    const input: ExecuteOptionInput = {
      privateKey: FAKE_PRIVATE_KEY,
      option: { direction: 'long', asset: 'WMNT', sizeMUSD: 100 },
      thesisHash: FAKE_THESIS_HASH,
      verdictHash: FAKE_VERDICT_HASH,
      optionRef: 'opt-long-1',
      confirmed: true,
      policy: SAMPLE_POLICY,
    };

    const result = await executeOption(input, deps);

    // swapFn called exactly once with correct path and amountIn
    expect(swapCalls).toHaveLength(1);
    const call = swapCalls[0]!;
    expect(call.path).toEqual([addresses.mUSD, addresses.WMNT]);
    expect(call.amountIn).toBe(scaleToBaseUnits(100, 6n));
    expect(call.privateKey).toBe(FAKE_PRIVATE_KEY);

    // writeDecisionFn called with asset, amountOut from swap, pnl=0n, optionRef echoed
    expect(decisionCalls).toHaveLength(1);
    const dec = decisionCalls[0]!;
    expect(dec.asset).toBe(addresses.WMNT as Address);
    expect(dec.amountOut).toBe(CANNED_SWAP_RESULT.amountOut);
    expect(dec.pnl).toBe(0n);
    expect(dec.optionRef).toBe('opt-long-1');

    // Returned swap result uses shared shape
    expect(result.swap.txHash).toBe(FAKE_SWAP_TX_HASH);
    expect(result.swap.amountIn).toBe(AMOUNT_IN.toString());
    expect(result.swap.amountOut).toBe(AMOUNT_OUT.toString());
    expect(result.swap.explorerUrl).toContain(FAKE_SWAP_TX_HASH);
    expect(result.swap.explorerUrl).toContain('mantlescan');
    expect(result.decisionTxHash).toBe(FAKE_DECISION_TX_HASH);
  });
});

// ── short path ────────────────────────────────────────────────────────────────

describe('executeOption — short path', () => {
  test('swapFn called with path [WMNT, mUSD] and amountIn scaled by 18 decimals', async () => {
    const { deps, swapCalls } = makeDeps();

    const input: ExecuteOptionInput = {
      privateKey: FAKE_PRIVATE_KEY,
      option: { direction: 'short', asset: 'WMNT', sizeMUSD: 100 },
      thesisHash: FAKE_THESIS_HASH,
      verdictHash: FAKE_VERDICT_HASH,
      optionRef: 'opt-short-1',
      confirmed: true,
      policy: SAMPLE_POLICY,
    };

    await executeOption(input, deps);

    expect(swapCalls).toHaveLength(1);
    const call = swapCalls[0]!;
    expect(call.path).toEqual([addresses.WMNT, addresses.mUSD]);
    expect(call.amountIn).toBe(scaleToBaseUnits(100, 18n));
  });
});
