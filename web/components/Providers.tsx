"use client";

import { useState, type ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mantleSepolia } from "@autonoe/chain";

// viem's `Chain` type is structurally compatible with the object exported by
// @autonoe/chain; cast keeps wagmi's stricter typing happy without redefining it.
const config = createConfig({
  chains: [mantleSepolia as never],
  connectors: [injected()],
  transports: {
    [mantleSepolia.id]: http(),
  },
});

export function Providers({ children }: { children: ReactNode }) {
  // Create the QueryClient once per app instance.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
