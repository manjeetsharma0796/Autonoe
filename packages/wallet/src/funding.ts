// Funding helpers for the embedded agent wallet:
//   - MNT_FAUCET_URL: surface the native Mantle Sepolia gas faucet link.
//   - MUSD_ADDRESS:   the live mUSD ERC-20 address on Mantle Sepolia.
//   - musdBalance:    read mUSD balance of any address.
//   - claimMusdFaucet: call faucet() on the mUSD contract (re-mint).
//   - seedAgentWallet: auto-seed on wallet creation (guards on zero MNT balance).

import { createPublicClient, createWalletClient, http } from 'viem';
import type { Address, Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { FAUCET_URL, RPC_URL, mantleSepolia, txUrl } from '@autonoe/chain';
import addresses from '@autonoe/chain/addresses.json' with { type: 'json' };

// ── public constants ──────────────────────────────────────────────────────────

/** The native MNT gas faucet on Mantle Sepolia. */
export const MNT_FAUCET_URL: string = FAUCET_URL;

/** Live mUSD ERC-20 address on Mantle Sepolia (chain 5003). */
export const MUSD_ADDRESS: Address = addresses.mUSD as Address;

// ── minimal ABI ──────────────────────────────────────────────────────────────

const MUSD_ABI = [
  { type: 'function', name: 'faucet', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

// ── injectable client interfaces (for testability) ───────────────────────────

export interface PublicClientLike {
  readContract(args: {
    address: Address;
    abi: typeof MUSD_ABI;
    functionName: 'balanceOf';
    args: [Address];
  }): Promise<bigint>;
  getBalance(args: { address: Address }): Promise<bigint>;
  waitForTransactionReceipt(args: {
    hash: Hex;
  }): Promise<{ status: 'success' | 'reverted' }>;
}

export interface WalletClientLike {
  writeContract(args: {
    address: Address;
    abi: typeof MUSD_ABI;
    functionName: 'faucet';
    args: [];
  }): Promise<Hex>;
}

export interface FundingClients {
  publicClient: PublicClientLike;
  walletClient: WalletClientLike;
}

/** Build real viem clients for production use. */
export function buildClients(privateKey: Hex): FundingClients {
  const publicClient = createPublicClient({
    chain: mantleSepolia,
    transport: http(RPC_URL),
  }) as unknown as PublicClientLike;

  const walletClient = createWalletClient({
    account: privateKeyToAccount(privateKey),
    chain: mantleSepolia,
    transport: http(RPC_URL),
  }) as unknown as WalletClientLike;

  return { publicClient, walletClient };
}

// ── read helpers ──────────────────────────────────────────────────────────────

/**
 * Read the mUSD balance of `address`.
 * Pass `opts.publicClient` to inject a fake in tests; omit to build a live client.
 */
export async function musdBalance(
  address: Address,
  opts?: { publicClient?: PublicClientLike },
): Promise<bigint> {
  const pc =
    opts?.publicClient ??
    (createPublicClient({
      chain: mantleSepolia,
      transport: http(RPC_URL),
    }) as unknown as PublicClientLike);

  return pc.readContract({
    address: MUSD_ADDRESS,
    abi: MUSD_ABI,
    functionName: 'balanceOf',
    args: [address],
  });
}

// ── faucet call ───────────────────────────────────────────────────────────────

/**
 * Call `faucet()` on the mUSD contract to mint 1,000 mUSD to the caller.
 * Subject to an 8h per-address cooldown and a 10k lifetime cap.
 *
 * Returns `{ hash, explorerUrl }` on success. Throws on revert (cooldown / cap).
 */
export async function claimMusdFaucet(
  privateKey: Hex,
  opts?: { clients?: FundingClients },
): Promise<{ hash: Hex; explorerUrl: string }> {
  const { publicClient, walletClient } = opts?.clients ?? buildClients(privateKey);

  const hash = await walletClient.writeContract({
    address: MUSD_ADDRESS,
    abi: MUSD_ABI,
    functionName: 'faucet',
    args: [],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status === 'reverted') {
    throw new Error(
      'mUSD faucet transaction reverted — you may be in the 8h cooldown or have hit the 10k lifetime cap.',
    );
  }

  return { hash, explorerUrl: txUrl(hash) };
}

// ── seed result ───────────────────────────────────────────────────────────────

export interface SeedResult {
  /** Whether the faucet was successfully called. */
  seeded: boolean;
  /** True when the wallet has zero native MNT and cannot pay gas. */
  needsGas: boolean;
  /** Always present — the URL to the native MNT faucet. */
  mntFaucetUrl: string;
  /** Tx hash (only when seeded === true). */
  hash?: Hex;
  /** Explorer link (only when seeded === true). */
  explorerUrl?: string;
}

/**
 * Auto-seed entry point — call this right after `createAgentWallet`.
 *
 * A freshly created agent EOA has zero native MNT, so it cannot pay gas to call
 * `faucet()`. If the native balance is zero we return `{ seeded:false, needsGas:true }`
 * and surface `mntFaucetUrl` so the UI can guide the user. Once MNT is present we
 * call the mUSD faucet and return the tx details.
 */
export async function seedAgentWallet(
  privateKey: Hex,
  address: Address,
  opts?: { clients?: FundingClients },
): Promise<SeedResult> {
  const clients = opts?.clients ?? buildClients(privateKey);
  const { publicClient } = clients;

  const native = await publicClient.getBalance({ address });

  if (native === 0n) {
    return {
      seeded: false,
      needsGas: true,
      mntFaucetUrl: MNT_FAUCET_URL,
    };
  }

  const { hash, explorerUrl } = await claimMusdFaucet(privateKey, { clients });
  return {
    seeded: true,
    needsGas: false,
    mntFaucetUrl: MNT_FAUCET_URL,
    hash,
    explorerUrl,
  };
}
