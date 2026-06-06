"use client";

// App-wide state for the embedded **agent wallet** (distinct from the user's
// MetaMask funding wallet, which lives in wagmi). Wraps the pure
// `@autonoe/wallet` core with a localStorage store + React state so any route
// can open the drawer and see/operate the agent wallet.
//
// Security note: we never keep the decrypted private key in React state. We
// unlock only to verify the passphrase (and for one-shot exports); the recovered
// key is discarded immediately. Signing lands later in T-304/T-602.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Address } from "viem";
import {
  createAgentWallet,
  exportKeystoreJSON,
  exportPrivateKey,
  getPolicy,
  loadKeystore,
  setPolicy as persistPolicy,
  unlock,
  DEFAULT_POLICY,
  type SpendingPolicy,
} from "@autonoe/wallet";
import { browserWalletStore } from "@/lib/walletStore";

interface WalletContextValue {
  /** True once initial state has hydrated from localStorage. */
  ready: boolean;
  /** An agent wallet keystore exists. */
  created: boolean;
  /** Passphrase verified this session (enables export). */
  unlocked: boolean;
  /** Agent EOA address, known as soon as the wallet is created. */
  address: Address | null;
  /** Current spending policy (per-trade cap + token allow-list). */
  policy: SpendingPolicy;
  create(passphrase: string): Promise<void>;
  unlockWallet(passphrase: string): Promise<void>;
  lock(): void;
  savePolicy(next: SpendingPolicy): Promise<void>;
  exportKey(passphrase: string): Promise<string>;
  exportKeystore(): Promise<string>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => browserWalletStore(), []);

  const [ready, setReady] = useState(false);
  const [address, setAddress] = useState<Address | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [policy, setPolicyState] = useState<SpendingPolicy>(DEFAULT_POLICY);

  // Hydrate from storage on mount.
  useEffect(() => {
    let alive = true;
    (async () => {
      const [ks, pol] = await Promise.all([loadKeystore(store), getPolicy(store)]);
      if (!alive) return;
      setAddress(ks?.address ?? null);
      setPolicyState(pol);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [store]);

  const create = useCallback(
    async (passphrase: string) => {
      const { address: addr } = await createAgentWallet(passphrase, store);
      setAddress(addr);
      setUnlocked(true);
    },
    [store],
  );

  const unlockWallet = useCallback(
    async (passphrase: string) => {
      const { address: addr } = await unlock(passphrase, store);
      setAddress(addr);
      setUnlocked(true);
    },
    [store],
  );

  const lock = useCallback(() => setUnlocked(false), []);

  const savePolicy = useCallback(
    async (next: SpendingPolicy) => {
      await persistPolicy(store, next);
      setPolicyState(next);
    },
    [store],
  );

  const exportKey = useCallback(
    (passphrase: string) => exportPrivateKey(passphrase, store),
    [store],
  );

  const exportKeystore = useCallback(() => exportKeystoreJSON(store), [store]);

  const value = useMemo<WalletContextValue>(
    () => ({
      ready,
      created: address !== null,
      unlocked,
      address,
      policy,
      create,
      unlockWallet,
      lock,
      savePolicy,
      exportKey,
      exportKeystore,
    }),
    [ready, address, unlocked, policy, create, unlockWallet, lock, savePolicy, exportKey, exportKeystore],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useAgentWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useAgentWallet must be used within <WalletProvider>");
  return ctx;
}
