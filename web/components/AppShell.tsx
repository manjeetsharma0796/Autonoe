"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/markets", label: "Markets" },
  { href: "/trade", label: "Trade" },
  { href: "/studio", label: "Studio" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
] as const;

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  // Scroll-condense the floating nav, matching the mockup.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
        }}
      >
        <div className="wrap">
          <nav className={scrolled ? "nav scrolled" : "nav"}>
            <Link href="/" className="brand">
              <span className="dot" /> AUTONOE
            </Link>

            <div className="navlinks">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={pathname === link.href ? "active" : undefined}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <button
              className="btn btn-gold"
              onClick={() => setDrawerOpen(true)}
              type="button"
            >
              {isConnected && address
                ? shortAddress(address)
                : "Connect →"}
            </button>
          </nav>
        </div>
      </header>

      {children}

      {/* Wallet drawer stub — page agents extend this later. */}
      {drawerOpen && (
        <>
          <div
            className="drawer-overlay"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside className="drawer" role="dialog" aria-label="Wallet">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span className="tag">Wallet</span>
              <button
                className="btn btn-ghost"
                onClick={() => setDrawerOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>

            <div style={{ marginTop: 28 }}>
              {isConnected && address ? (
                <>
                  <p
                    style={{
                      fontFamily: "var(--mono)",
                      color: "var(--ink)",
                      wordBreak: "break-all",
                    }}
                  >
                    {address}
                  </p>
                  <button
                    className="btn btn-ghost"
                    style={{ marginTop: 18 }}
                    onClick={() => disconnect()}
                    type="button"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <>
                  <p className="sub" style={{ marginTop: 0 }}>
                    Connect MetaMask to use the agent wallet on Mantle Sepolia.
                  </p>
                  <button
                    className="btn btn-gold"
                    style={{ marginTop: 18 }}
                    disabled={isPending}
                    onClick={() => connect({ connector: injected() })}
                    type="button"
                  >
                    {isPending ? "Connecting…" : "Connect MetaMask →"}
                  </button>
                </>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
