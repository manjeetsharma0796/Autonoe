// Browser adapter for the `@autonoe/wallet` `WalletStore` interface, backed by
// localStorage. SSR-safe: every method no-ops / returns null when `window` is
// absent so it can be imported from client components without crashing during
// the server render pass.

import type { WalletStore } from "@autonoe/wallet";

let singleton: WalletStore | null = null;

function makeStore(): WalletStore {
  return {
    async get(key) {
      if (typeof window === "undefined") return null;
      return window.localStorage.getItem(key);
    },
    async set(key, value) {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(key, value);
    },
  };
}

/** Shared localStorage-backed wallet store (one instance per browser tab). */
export function browserWalletStore(): WalletStore {
  if (!singleton) singleton = makeStore();
  return singleton;
}
