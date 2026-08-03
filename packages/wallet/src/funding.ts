// Funding helpers (T-305): read agent balances, mint mUSD via the token faucet,
// and surface the native OKB faucet link. The agent needs a little OKB for gas
// before it can call the mUSD faucet — see OKB_FAUCET_URL.

import { type Hex } from 'viem';
import { getBalance, readContract, writeContract, waitForTransactionReceipt } from 'viem/actions';
import {
  getPublicClient,
  getWalletClient,
  accountFromKey,
  addresses,
  musdAbi,
  erc20Abi,
  FAUCET_URL,
  txUrl,
} from '@autonoe/chain';

/** Native OKB faucet (gas) — surfaced in the wallet drawer. */
export const OKB_FAUCET_URL = FAUCET_URL;

export interface AgentBalances {
  /** Native OKB (gas), 18dec base units. */
  okb: bigint;
  /** mUSD, 6dec base units. */
  mUSD: bigint;
  /** WOKB, 18dec base units. */
  wokb: bigint;
}

export async function getAgentBalances(address: `0x${string}`, rpcUrl?: string): Promise<AgentBalances> {
  const pc = getPublicClient(rpcUrl);
  const [okb, mUSD, wokb] = await Promise.all([
    getBalance(pc, { address }),
    readContract(pc, { address: addresses.mUSD, abi: erc20Abi, functionName: 'balanceOf', args: [address] }),
    readContract(pc, { address: addresses.WOKB, abi: erc20Abi, functionName: 'balanceOf', args: [address] }),
  ]);
  return { okb, mUSD, wokb };
}

/** Mint mUSD to the agent via the token faucet (cooldown + cap enforced on-chain). */
export async function fundMUSD(privateKey: Hex, rpcUrl?: string): Promise<{ txHash: Hex; explorerUrl: string }> {
  const account = accountFromKey(privateKey);
  const pc = getPublicClient(rpcUrl);
  const wc = getWalletClient(account, rpcUrl);
  const hash = await writeContract(wc, {
    address: addresses.mUSD,
    abi: musdAbi,
    functionName: 'faucet',
    args: [],
  });
  const r = await waitForTransactionReceipt(pc, { hash });
  if (r.status !== 'success') throw new Error(`mUSD faucet reverted: ${txUrl(hash)}`);
  return { txHash: hash, explorerUrl: txUrl(hash) };
}
