// Swap execution against the Uniswap V2 router on Mantle Sepolia.
//   getQuote() — router.getAmountsOut for a path
//   swap()     — approve tokenIn, then swapExactTokensForTokens with a
//                slippage-protected minimum, returning the realized amountOut.

import { parseEventLogs, type Address, type Hex } from 'viem';
import { addresses, getPublicClient, getWalletClient } from './clients.js';
import { ERC20_ABI, ROUTER_ABI } from './abis.js';

const TRANSFER_EVENT = [
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
] as const;

const DEFAULT_SLIPPAGE_BPS = 50; // 0.5%
const DEFAULT_DEADLINE_SEC = 1200; // 20 min

/** Quote the output amounts for `amountIn` along `path` (first/last are in/out). */
export async function getQuote(amountIn: bigint, path: Address[]): Promise<bigint[]> {
  const pc = getPublicClient();
  const amounts = await pc.readContract({
    address: addresses.router,
    abi: ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: [amountIn, path],
  });
  return [...amounts];
}

export interface SwapParams {
  privateKey: Hex;
  amountIn: bigint;
  /** Token path, e.g. [mUSD, WMNT]. */
  path: Address[];
  /** Max slippage in basis points (default 50 = 0.5%). */
  slippageBps?: number;
  deadlineSec?: number;
}

export interface SwapResult {
  approveTxHash: Hex;
  swapTxHash: Hex;
  amountIn: bigint;
  /** Quoted output before slippage. */
  expectedOut: bigint;
  /** Slippage-protected floor sent on-chain. */
  minOut: bigint;
  /** Actual tokens received (tokenOut balance delta). */
  amountOut: bigint;
}

/**
 * Execute an exact-input swap from the wallet behind `privateKey`. Approves the
 * router for `amountIn`, swaps along `path`, and measures the realized output by
 * the recipient's tokenOut balance delta. Throws if the path is malformed.
 */
export async function swap(params: SwapParams): Promise<SwapResult> {
  const { privateKey, amountIn, path } = params;
  if (path.length < 2) throw new Error('swap path needs at least [tokenIn, tokenOut]');
  const slippageBps = BigInt(params.slippageBps ?? DEFAULT_SLIPPAGE_BPS);

  const pc = getPublicClient();
  const wc = getWalletClient(privateKey);
  const account = wc.account!;
  const tokenIn = path[0]!;
  const tokenOut = path[path.length - 1]!;

  const amounts = await getQuote(amountIn, path);
  const expectedOut = amounts[amounts.length - 1]!;
  const minOut = expectedOut - (expectedOut * slippageBps) / 10_000n;

  // Approve exactly amountIn, wait for the receipt before swapping. The wallet
  // client already has the chain bound, so `chain` is omitted on writes.
  const approveTxHash = await wc.writeContract({
    address: tokenIn,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [addresses.router, amountIn],
    account,
  });
  await pc.waitForTransactionReceipt({ hash: approveTxHash });

  const deadline = BigInt(Math.floor(Date.now() / 1000) + (params.deadlineSec ?? DEFAULT_DEADLINE_SEC));
  const swapTxHash = await wc.writeContract({
    address: addresses.router,
    abi: ROUTER_ABI,
    functionName: 'swapExactTokensForTokens',
    args: [amountIn, minOut, path, account.address, deadline],
    account,
  });
  const receipt = await pc.waitForTransactionReceipt({ hash: swapTxHash });

  // Realized output = sum of tokenOut Transfers to the recipient in this tx.
  // Read from the receipt (authoritative) rather than a balance delta, which a
  // load-balanced public RPC can serve from a lagging node.
  const transfers = parseEventLogs({
    abi: TRANSFER_EVENT,
    eventName: 'Transfer',
    logs: receipt.logs,
  });
  const amountOut = transfers
    .filter(
      (l) =>
        l.address.toLowerCase() === tokenOut.toLowerCase() &&
        l.args.to.toLowerCase() === account.address.toLowerCase(),
    )
    .reduce((sum, l) => sum + l.args.value, 0n);

  return { approveTxHash, swapTxHash, amountIn, expectedOut, minOut, amountOut };
}
