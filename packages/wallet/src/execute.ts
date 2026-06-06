// Execution orchestrator for T-304: agent-sign + execute.
//
// Ties together:
//   - enforcePolicy  (T-303) — hard-cap + token allow-list guard
//   - swap           (T-108) — approve + swapExactTokensForTokens on-chain
//   - writeDecision  (T-108) — append an on-chain DecisionLog entry
//
// Manual-confirm guard: `confirmed` MUST be explicitly set to `true` by the
// caller; we never auto-execute. The UI must surface a confirmation step before
// passing `confirmed: true`.

import type { Address, Hex } from 'viem';
import type { Direction, AssetSymbol, SwapResult } from '@autonoe/shared';
import {
  swap as chainSwap,
  writeDecision as chainWriteDecision,
  addresses as chainAddresses,
  txUrl,
  type SwapResult as ChainSwapResult,
  type SwapParams,
  type DecisionInput,
  type ChainAddresses,
} from '@autonoe/chain';
import { enforcePolicy, type SpendingPolicy } from './policy.js';

// ── decimal constants ─────────────────────────────────────────────────────────

const MUSD_DECIMALS = 6n;
const ASSET_DECIMALS = 18n;

// ── public types ──────────────────────────────────────────────────────────────

/** Minimal option shape accepted by the executor (direction + asset + size). */
export interface ExecutableOption {
  /** Stable id — optional, carried through to optionRef if set. */
  id?: string;
  direction: Direction;
  asset: AssetSymbol;
  /** Trade notional denominated in mUSD. */
  sizeMUSD: number;
}

export interface ExecuteOptionInput {
  privateKey: Hex;
  option: ExecutableOption;
  thesisHash: Hex;
  verdictHash: Hex;
  /** References a ThesisOption.id / RefinedOption.optionRef on the off-chain record. */
  optionRef: string;
  /**
   * Manual-confirm guard — MUST be `true` to execute.
   * The UI is responsible for showing a confirmation dialog before setting this.
   * No auto-execution path exists.
   */
  confirmed: boolean;
  policy: SpendingPolicy;
  /** Max slippage in basis points (default 50 = 0.5%). */
  slippageBps?: number;
}

export interface ExecuteOptionResult {
  /** API/UI-facing swap summary (shared shape). */
  swap: SwapResult;
  /** Hash of the on-chain DecisionLog write. */
  decisionTxHash: Hex;
}

/** Injectable chain dependencies — pass fakes in tests, omit in production. */
export interface ExecuteDeps {
  swapFn?: (p: SwapParams) => Promise<ChainSwapResult>;
  writeDecisionFn?: (i: DecisionInput) => Promise<{ txHash: Hex }>;
  addresses?: ChainAddresses;
}

// ── pure helpers ──────────────────────────────────────────────────────────────

/**
 * Scale a JS number to on-chain base units.
 *
 * @example scaleToBaseUnits(1000, 6n) === 1_000_000_000n
 */
export function scaleToBaseUnits(n: number, decimals: bigint): bigint {
  return BigInt(Math.floor(n * Number(10n ** decimals)));
}

/**
 * Build the swap path and `amountIn` for an option.
 *
 * - `long | hold | hedge` → buy asset with mUSD:
 *     path = [mUSD, assetAddress], amountIn in mUSD decimals (6).
 * - `short` → sell asset for mUSD:
 *     path = [assetAddress, mUSD], amountIn in asset decimals (18).
 *     Note: for the testnet demo `sizeMUSD` is treated as the asset notional
 *     on a short — realized-PnL refinement is T-603/T-409's responsibility.
 */
export function buildSwapPlan(
  option: ExecutableOption,
  addrs: ChainAddresses,
): { path: Address[]; amountIn: bigint; assetAddress: Address } {
  const assetAddress = addrs[option.asset] as Address;

  if (option.direction === 'short') {
    return {
      path: [assetAddress, addrs.mUSD],
      amountIn: scaleToBaseUnits(option.sizeMUSD, ASSET_DECIMALS),
      assetAddress,
    };
  }

  // long | hold | hedge — open with mUSD
  return {
    path: [addrs.mUSD, assetAddress],
    amountIn: scaleToBaseUnits(option.sizeMUSD, MUSD_DECIMALS),
    assetAddress,
  };
}

// ── main orchestrator ─────────────────────────────────────────────────────────

/**
 * Execute an option: policy-check → sign + broadcast swap → write DecisionLog.
 *
 * Step order is intentional:
 *   1. Confirm guard  — surface immediately if `confirmed` is false.
 *   2. Policy check   — throw before touching the chain if policy is violated.
 *   3. Build swap plan — pure, no I/O.
 *   4. Swap           — approve + swapExactTokensForTokens.
 *   5. DecisionLog    — append provenance on-chain.
 *                       `pnl` is 0n for an opening trade; realized PnL is
 *                       computed in a later pipeline step (T-603).
 *   6. Map result to the shared SwapResult shape and return.
 */
export async function executeOption(
  input: ExecuteOptionInput,
  deps?: ExecuteDeps,
): Promise<ExecuteOptionResult> {
  // 1. Manual-confirm guard — BEFORE any policy or swap.
  if (!input.confirmed) {
    throw new Error('Execution requires explicit confirmation (manual-confirm)');
  }

  // 2. Spending-policy check — throws on over-cap or disallowed token.
  enforcePolicy(input.policy, {
    token: input.option.asset,
    amountMUSD: input.option.sizeMUSD,
  });

  // 3. Build swap plan.
  const addrs = deps?.addresses ?? chainAddresses;
  const { path, amountIn, assetAddress } = buildSwapPlan(input.option, addrs);

  // 4. Sign + broadcast the swap.
  const swapFn = deps?.swapFn ?? chainSwap;
  const result = await swapFn({
    privateKey: input.privateKey,
    amountIn,
    path,
    slippageBps: input.slippageBps,
  });

  // 5. Write the on-chain DecisionLog entry.
  //    pnl = 0n on an opening trade; realized PnL is a later pipeline step.
  const writeDecisionFn = deps?.writeDecisionFn ?? chainWriteDecision;
  const { txHash: decisionTxHash } = await writeDecisionFn({
    privateKey: input.privateKey,
    thesisHash: input.thesisHash,
    verdictHash: input.verdictHash,
    asset: assetAddress,
    amountIn: result.amountIn,
    amountOut: result.amountOut,
    pnl: 0n,
    optionRef: input.optionRef,
  });

  // 6. Map chain result → shared SwapResult (UI/API-facing shape).
  const swap: SwapResult = {
    txHash: result.swapTxHash,
    amountIn: result.amountIn.toString(),
    amountOut: result.amountOut.toString(),
    explorerUrl: txUrl(result.swapTxHash),
  };

  return { swap, decisionTxHash };
}
