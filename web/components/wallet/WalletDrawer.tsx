"use client";

// Global slide-over wallet drawer (PRD §11a). Reachable from every route via the
// AppShell nav button. Visually separates two wallets:
//   • Funding wallet  — the user's MetaMask EOA (wagmi), funds the agent.
//   • Agent wallet     — the autonomous embedded EOA that holds mUSD and signs
//                        swaps. This is the "acting wallet".
//
// Balances + faucet are sample data for now; live reads land with the chain lib
// (T-602). Create / unlock / export / spending-limits are real and call
// `@autonoe/wallet` through the WalletProvider context.

import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import type { SpendingPolicy } from "@autonoe/wallet";
import { useAgentWallet } from "./WalletProvider";

const ALL_TOKENS = ["WMNT", "MockBTC", "MockETH"] as const;

/** Sample agent-wallet balances — replaced by live chain reads in T-602. */
const SAMPLE_BALANCES: { symbol: string; amount: string }[] = [
  { symbol: "mUSD", amount: "1,000.00" },
  { symbol: "WMNT", amount: "0.00" },
  { symbol: "MockBTC", amount: "0.00" },
  { symbol: "MockETH", amount: "0.00" },
];

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function WalletDrawer({ onClose }: { onClose: () => void }) {
  const { address: funder, isConnected } = useAccount();
  const { connect, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();

  const wallet = useAgentWallet();

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} aria-hidden />
      <aside className="drawer" role="dialog" aria-label="Wallet">
        <div className="drawer-head">
          <span className="tag">Wallet</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="wallet-pill agent" title="The agent wallet signs swaps">
              Acting · Agent
            </span>
            <button className="btn btn-ghost" onClick={onClose} type="button">
              Close
            </button>
          </div>
        </div>

        <div className="drawer-body">
          {/* ── Funding wallet (MetaMask) ─────────────────────────────── */}
          <section className="wallet-card funding">
            <div className="wallet-label">
              <span className="wallet-pill funding">Funding</span>
              MetaMask wallet
            </div>
            {isConnected && funder ? (
              <>
                <p className="mono-addr">{funder}</p>
                <button
                  className="btn btn-ghost"
                  onClick={() => disconnect()}
                  type="button"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <>
                <p className="sub" style={{ marginTop: 0 }}>
                  Connect MetaMask to fund the agent wallet on Mantle Sepolia.
                </p>
                <button
                  className="btn btn-gold"
                  disabled={connecting}
                  onClick={() => connect({ connector: injected() })}
                  type="button"
                >
                  {connecting ? "Connecting…" : "Connect MetaMask →"}
                </button>
              </>
            )}
          </section>

          {/* ── Agent wallet (autonomous signer) ──────────────────────── */}
          <AgentWalletCard wallet={wallet} />

          {/* ── Balances ──────────────────────────────────────────────── */}
          {wallet.created && (
            <section className="wallet-card">
              <div className="wallet-label">Balances</div>
              <div className="balance-list">
                {SAMPLE_BALANCES.map((b) => (
                  <div className="balance-row" key={b.symbol}>
                    <span>{b.symbol}</span>
                    <span className="mono">{b.amount}</span>
                  </div>
                ))}
              </div>
              <button className="btn btn-ghost" type="button" disabled title="Wires up in T-602">
                Fund / mint faucet — soon
              </button>
              <p className="hint">Live balances + faucet wire up with the chain lib (T-602).</p>
            </section>
          )}

          {/* ── Spending limits ───────────────────────────────────────── */}
          {wallet.created && <SpendingLimits wallet={wallet} />}

          {/* ── Export ────────────────────────────────────────────────── */}
          {wallet.created && <ExportPanel wallet={wallet} />}
        </div>

        <p className="drawer-disclaimer">
          Testnet (Mantle Sepolia) · not financial advice.
        </p>
      </aside>
    </>
  );
}

type Wallet = ReturnType<typeof useAgentWallet>;

function AgentWalletCard({ wallet }: { wallet: Wallet }) {
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (fn: (p: string) => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn(pass);
      setPass("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="wallet-card agent">
      <div className="wallet-label">
        <span className="wallet-pill agent">Agent</span>
        Autonomous wallet
      </div>

      {!wallet.created ? (
        <>
          <p className="sub" style={{ marginTop: 0 }}>
            Create the agent wallet — a dedicated EOA that holds mUSD and signs
            swaps. Its key is encrypted with your passphrase, in your browser.
          </p>
          <form
            className="field"
            onSubmit={(e) => {
              e.preventDefault();
              if (pass) void submit(wallet.create);
            }}
          >
            <input
              type="password"
              placeholder="Choose a passphrase"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoComplete="new-password"
            />
            <button className="btn btn-gold" type="submit" disabled={busy || !pass}>
              {busy ? "Creating…" : "Create agent wallet"}
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="mono-addr">{wallet.address}</p>
          <div className="status-row">
            <span className={wallet.unlocked ? "status unlocked" : "status locked"}>
              {wallet.unlocked ? "● Unlocked" : "● Locked"}
            </span>
            {wallet.unlocked && (
              <button className="btn btn-ghost btn-sm" type="button" onClick={wallet.lock}>
                Lock
              </button>
            )}
          </div>
          {!wallet.unlocked && (
            <form
              className="field"
              onSubmit={(e) => {
                e.preventDefault();
                if (pass) void submit(wallet.unlockWallet);
              }}
            >
              <input
                type="password"
                placeholder="Passphrase to unlock"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                autoComplete="current-password"
              />
              <button className="btn btn-gold" type="submit" disabled={busy || !pass}>
                {busy ? "Unlocking…" : "Unlock"}
              </button>
            </form>
          )}
        </>
      )}

      {error && <p className="error-text">{error}</p>}
    </section>
  );
}

function SpendingLimits({ wallet }: { wallet: Wallet }) {
  const [maxTrade, setMaxTrade] = useState(String(wallet.policy.maxTradeMUSD));
  const [tokens, setTokens] = useState<string[]>(wallet.policy.allowedTokens);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const toggle = (t: string) =>
    setTokens((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const save = async () => {
    setBusy(true);
    setSaved(false);
    const next: SpendingPolicy = {
      maxTradeMUSD: Number(maxTrade) || 0,
      allowedTokens: tokens,
    };
    await wallet.savePolicy(next);
    setBusy(false);
    setSaved(true);
  };

  return (
    <section className="wallet-card">
      <div className="wallet-label">Spending limits</div>
      <label className="field-inline">
        <span>Max / trade (mUSD)</span>
        <input
          type="number"
          min={0}
          value={maxTrade}
          onChange={(e) => {
            setMaxTrade(e.target.value);
            setSaved(false);
          }}
        />
      </label>
      <div className="token-toggles">
        {ALL_TOKENS.map((t) => (
          <button
            key={t}
            type="button"
            className={tokens.includes(t) ? "chip on" : "chip"}
            onClick={() => {
              toggle(t);
              setSaved(false);
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <button className="btn btn-ghost" type="button" onClick={save} disabled={busy}>
        {busy ? "Saving…" : saved ? "Saved ✓" : "Save limits"}
      </button>
    </section>
  );
}

function ExportPanel({ wallet }: { wallet: Wallet }) {
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copyKey = async () => {
    setError(null);
    setMsg(null);
    try {
      const key = await wallet.exportKey(pass);
      await navigator.clipboard.writeText(key);
      setPass("");
      setMsg("Private key copied to clipboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    }
  };

  const downloadKeystore = async () => {
    setError(null);
    setMsg(null);
    try {
      const json = await wallet.exportKeystore();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "autonoe-agent-keystore.json";
      a.click();
      URL.revokeObjectURL(url);
      setMsg("Encrypted keystore downloaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    }
  };

  return (
    <section className="wallet-card">
      <div className="wallet-label">Export</div>
      <form
        className="field"
        onSubmit={(e) => {
          e.preventDefault();
          if (pass) void copyKey();
        }}
      >
        <input
          type="password"
          placeholder="Passphrase to reveal key"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          autoComplete="current-password"
        />
        <button className="btn btn-ghost" type="submit" disabled={!pass}>
          Copy private key
        </button>
      </form>
      <button className="btn btn-ghost" type="button" onClick={downloadKeystore}>
        Download keystore JSON
      </button>
      {msg && <p className="hint">{msg}</p>}
      {error && <p className="error-text">{error}</p>}
    </section>
  );
}
