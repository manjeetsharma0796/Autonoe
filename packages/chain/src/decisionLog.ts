// Read/write the on-chain DecisionLog (T-105). `writeDecision` records an
// executed option's provenance; `readHistory` returns a user's full history for
// `/api/history` (T-207).

import type { Address, Hex } from 'viem';
import { addresses, getPublicClient, getWalletClient } from './clients.js';
import { DECISION_LOG_ABI } from './abis.js';

export interface DecisionInput {
  privateKey: Hex;
  thesisHash: Hex;
  verdictHash: Hex;
  /** Traded token address. */
  asset: Address;
  amountIn: bigint;
  amountOut: bigint;
  /** Realized PnL in mUSD base units; may be negative. */
  pnl: bigint;
  /** Mirrors the off-chain RefinedOption.optionRef. */
  optionRef: string;
}

export interface DecisionRecord {
  user: Address;
  thesisHash: Hex;
  verdictHash: Hex;
  asset: Address;
  amountIn: bigint;
  amountOut: bigint;
  pnl: bigint;
  optionRef: string;
  timestamp: bigint;
}

/** Append a decision for the wallet behind `privateKey`. */
export async function writeDecision(input: DecisionInput): Promise<{ txHash: Hex }> {
  const wc = getWalletClient(input.privateKey);
  const pc = getPublicClient();
  const account = wc.account!;
  const txHash = await wc.writeContract({
    address: addresses.decisionLog,
    abi: DECISION_LOG_ABI,
    functionName: 'logDecision',
    args: [
      input.thesisHash,
      input.verdictHash,
      input.asset,
      input.amountIn,
      input.amountOut,
      input.pnl,
      input.optionRef,
    ],
    account,
  });
  await pc.waitForTransactionReceipt({ hash: txHash });
  return { txHash };
}

/** Full per-user decision history, oldest→newest. */
export async function readHistory(user: Address): Promise<DecisionRecord[]> {
  const pc = getPublicClient();
  const history = await pc.readContract({
    address: addresses.decisionLog,
    abi: DECISION_LOG_ABI,
    functionName: 'getUserDecisions',
    args: [user],
  });
  return history.map((d) => ({ ...d }));
}
