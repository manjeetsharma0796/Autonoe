import { describe, expect, test } from 'bun:test';
import { FAUCET_URL } from '@autonoe/chain';
import type { Address, Hex } from 'viem';
import {
  MNT_FAUCET_URL,
  MUSD_ADDRESS,
  claimMusdFaucet,
  musdBalance,
  seedAgentWallet,
  type FundingClients,
  type PublicClientLike,
  type WalletClientLike,
} from '../src/funding.ts';

// ── constants ─────────────────────────────────────────────────────────────────

describe('constants', () => {
  test('MNT_FAUCET_URL matches @autonoe/chain FAUCET_URL', () => {
    expect(MNT_FAUCET_URL).toBe(FAUCET_URL);
  });

  test('MNT_FAUCET_URL is a non-empty https URL', () => {
    expect(MNT_FAUCET_URL.length).toBeGreaterThan(0);
    expect(MNT_FAUCET_URL.startsWith('https://')).toBe(true);
  });

  test('MUSD_ADDRESS matches the addresses.json mUSD value', () => {
    expect(MUSD_ADDRESS.toLowerCase()).toBe('0x1f7d7c437858e88b10f73e6590db1bb189cad7ef');
  });
});

// ── helpers ───────────────────────────────────────────────────────────────────

const FAKE_HASH = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as Hex;
const FAKE_PRIVATE_KEY =
  '0x0000000000000000000000000000000000000000000000000000000000000001' as Hex;
const FAKE_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as Address;

/** Build fake clients with configurable behaviour. */
function makeFakeClients(opts: {
  nativeBalance?: bigint;
  musdBal?: bigint;
  receiptStatus?: 'success' | 'reverted';
  writeSpy?: (args: unknown) => void;
}): FundingClients {
  const {
    nativeBalance = 1_000_000_000_000_000_000n,
    musdBal = 0n,
    receiptStatus = 'success',
    writeSpy,
  } = opts;

  const publicClient: PublicClientLike = {
    async readContract(_args) {
      return musdBal;
    },
    async getBalance(_args) {
      return nativeBalance;
    },
    async waitForTransactionReceipt(_args) {
      return { status: receiptStatus };
    },
  };

  const walletClient: WalletClientLike = {
    async writeContract(args) {
      writeSpy?.(args);
      return FAKE_HASH;
    },
  };

  return { publicClient, walletClient };
}

// ── musdBalance ───────────────────────────────────────────────────────────────

describe('musdBalance', () => {
  test('returns the bigint from a fake readContract', async () => {
    const clients = makeFakeClients({ musdBal: 5_000_000n });
    const result = await musdBalance(FAKE_ADDRESS, { publicClient: clients.publicClient });
    expect(result).toBe(5_000_000n);
  });
});

// ── claimMusdFaucet ───────────────────────────────────────────────────────────

describe('claimMusdFaucet', () => {
  test('calls writeContract with faucet on MUSD_ADDRESS and returns hash + explorerUrl', async () => {
    const callArgs: unknown[] = [];
    const clients = makeFakeClients({
      writeSpy: (a) => callArgs.push(a),
      receiptStatus: 'success',
    });

    const result = await claimMusdFaucet(FAKE_PRIVATE_KEY, { clients });

    expect(result.hash).toBe(FAKE_HASH);
    // explorerUrl should contain the hash and mantlescan
    expect(result.explorerUrl).toContain(FAKE_HASH);
    expect(result.explorerUrl).toContain('mantlescan');

    // Assert the write was called with correct args
    expect(callArgs).toHaveLength(1);
    const wrote = callArgs[0] as { address: string; functionName: string };
    expect(wrote.functionName).toBe('faucet');
    expect(wrote.address.toLowerCase()).toBe(MUSD_ADDRESS.toLowerCase());
  });

  test('throws when receipt status is reverted', async () => {
    const clients = makeFakeClients({ receiptStatus: 'reverted' });
    await expect(claimMusdFaucet(FAKE_PRIVATE_KEY, { clients })).rejects.toThrow(
      /reverted|cooldown|cap/i,
    );
  });
});

// ── seedAgentWallet ───────────────────────────────────────────────────────────

describe('seedAgentWallet', () => {
  test('returns { seeded:false, needsGas:true, mntFaucetUrl } when native balance is 0', async () => {
    const callArgs: unknown[] = [];
    const clients = makeFakeClients({
      nativeBalance: 0n,
      writeSpy: (a) => callArgs.push(a),
    });

    const result = await seedAgentWallet(FAKE_PRIVATE_KEY, FAKE_ADDRESS, { clients });

    expect(result.seeded).toBe(false);
    expect(result.needsGas).toBe(true);
    expect(result.mntFaucetUrl).toBe(MNT_FAUCET_URL);
    // writeContract must NOT have been called
    expect(callArgs).toHaveLength(0);
    expect(result.hash).toBeUndefined();
  });

  test('calls faucet and returns { seeded:true, hash, explorerUrl } when native balance > 0', async () => {
    const callArgs: unknown[] = [];
    const clients = makeFakeClients({
      nativeBalance: 1_000_000_000_000_000_000n,
      writeSpy: (a) => callArgs.push(a),
      receiptStatus: 'success',
    });

    const result = await seedAgentWallet(FAKE_PRIVATE_KEY, FAKE_ADDRESS, { clients });

    expect(result.seeded).toBe(true);
    expect(result.needsGas).toBe(false);
    expect(result.hash).toBe(FAKE_HASH);
    expect(result.explorerUrl).toContain(FAKE_HASH);
    expect(callArgs).toHaveLength(1);
  });
});
