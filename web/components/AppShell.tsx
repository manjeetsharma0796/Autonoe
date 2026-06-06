"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { WalletDrawer } from "./wallet/WalletDrawer";

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

  // Scroll-condense the floating nav, matching the mockup.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

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
              {isConnected && address ? shortAddress(address) : "Connect →"}
            </button>
          </nav>
        </div>
      </header>

      {children}

      {drawerOpen && <WalletDrawer onClose={() => setDrawerOpen(false)} />}

      {/* Persistent testnet / disclaimer marker, present on every route. */}
      <div className="disclaimer-bar" role="note">
        Testnet · not financial advice
      </div>
    </>
  );
}
