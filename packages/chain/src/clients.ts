// viem clients + deployed-address registry for Mantle Sepolia. The public client
// reads (quotes, balances, history); a wallet client built from a private key
// signs swaps + decision writes.

import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mantleSepolia, RPC_URL } from './network.js';
import addressesJson from '../addresses.json' with { type: 'json' };

// Promote the plain network const to a viem Chain so client/write types carry
// the chain (avoids the `as never` cast that collapsed write params to `never`).
const chain = defineChain(mantleSepolia);

export interface ChainAddresses {
  chainId: number;
  mUSD: Address;
  WMNT: Address;
  MockBTC: Address;
  MockETH: Address;
  factory: Address;
  router: Address;
  decisionLog: Address;
  pools: { mUSD_WMNT: Address; mUSD_MockBTC: Address; mUSD_MockETH: Address };
}

/** Live deployed addresses (written by T-107's deploy script). */
export const addresses = addressesJson as unknown as ChainAddresses;

// Return types are inferred (not annotated as the generic Public/WalletClient)
// so viem keeps the bound chain — that makes `chain` optional on writes and
// keeps readContract return types precise.

/** Read-only client for quotes, balances, and history. */
export function getPublicClient() {
  return createPublicClient({ chain, transport: http(RPC_URL) });
}

/** Signing client bound to `privateKey` (the agent wallet, T-301/T-304). */
export function getWalletClient(privateKey: Hex) {
  return createWalletClient({
    account: privateKeyToAccount(privateKey),
    chain,
    transport: http(RPC_URL),
  });
}
