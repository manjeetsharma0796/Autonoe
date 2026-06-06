"use client";

// ExecuteDialog — shared modal for the execute flow (T-409).
//
// Stages: idle/confirm → signing → success | error
//
// Security note: the private key is obtained ephemerally from `unlock()`
// immediately before calling `executeOption`, and is never stored in React
// state, a ref, or context. It goes out of scope as soon as the async call
// completes. (Mirrors the note in WalletProvider.tsx.)

import { useCallback, useEffect, useRef, useState } from "react";
import type { DebateResult, Thesis, ThesisOption } from "@autonoe/shared";
import { executeOption, unlock } from "@autonoe/wallet";
import type { ExecuteOptionResult } from "@autonoe/wallet";
import { browserWalletStore } from "@/lib/walletStore";
import { useAgentWallet } from "@/components/wallet/WalletProvider";
import { thesisHash, verdictHash } from "@/lib/executeHashes";
import { dirLabel, moneyMUSD, bandLabel } from "@/components/studio/format";
import { recordDecision } from "@/lib/api";
import styles from "./ExecuteDialog.module.css";

// ── types ─────────────────────────────────────────────────────────────────────

export interface ExecuteDialogProps {
  /** The resolved option to execute (direction/asset/sizeMUSD required). */
  option: ThesisOption;
  /** The parent thesis — used for hash + predicted return display. */
  thesis: Thesis;
  /**
   * The DebateResult (judge path). Pass `null` on the direct-from-thesis path;
   * the verdictHash will be a sentinel hash of "no-verdict".
   */
  verdict: DebateResult | null;
  /**
   * The optionRef to pass to executeOption.
   * Typically ThesisOption.id on the thesis path, or RefinedOption.optionRef
   * on the judge path (which resolves to the same ThesisOption.id).
   */
  optionRef: string;
  onClose: () => void;
}

type Stage = "confirm" | "signing" | "success" | "error";

// ── small icon helpers (inline SVG — avoids icon import coupling) ────────────

function WarnIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 3L18 17H2L10 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M10 8v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="10" cy="14.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M5.5 2.5H2a1 1 0 00-1 1V12a1 1 0 001 1h8.5a1 1 0 001-1V8.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M8 2.5h3.5v3.5M11.5 2.5L6 8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export function ExecuteDialog({
  option,
  thesis,
  verdict,
  optionRef,
  onClose,
}: ExecuteDialogProps) {
  const { created, policy, address } = useAgentWallet();

  const [stage, setStage] = useState<Stage>("confirm");
  const [passphrase, setPassphrase] = useState("");
  const [result, setResult] = useState<ExecuteOptionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const passphraseRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Focus the passphrase input when the dialog opens (if wallet exists).
  useEffect(() => {
    if (created && passphraseRef.current) {
      passphraseRef.current.focus();
    }
  }, [created]);

  // Escape key closes the dialog (unless signing is in progress).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && stage !== "signing") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [stage, onClose]);

  // Backdrop click closes the dialog (unless signing is in progress).
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === backdropRef.current && stage !== "signing") onClose();
    },
    [stage, onClose],
  );

  const handleConfirm = async () => {
    if (!created) return; // guarded by UI
    setStage("signing");
    setErrorMsg(null);

    try {
      // Obtain private key ephemerally — never stored in state.
      const { privateKey } = await unlock(passphrase, browserWalletStore());

      const tHash = thesisHash(thesis);
      const vHash = verdictHash(verdict);

      const res = await executeOption({
        privateKey,
        option: {
          id: option.id,
          direction: option.direction,
          asset: option.asset,
          sizeMUSD: option.sizeMUSD,
        },
        thesisHash: tHash,
        verdictHash: vHash,
        optionRef,
        confirmed: true,
        policy,
        slippageBps: 50,
      });

      setResult(res);

      // Best-effort: record off-chain metadata so /api/history shows the full
      // merged record (T-603). Uses the same tHash passed to executeOption so
      // the join key matches the on-chain DecisionLog entry exactly.
      void recordDecision({
        thesisHash: tHash,
        thesisId: thesis.id,
        source: thesis.source,
        judged: verdict !== null,
        chosenOptionRef: optionRef,
        txHash: res.swap.txHash,
        pnlMUSD: 0,                  // realized PnL is computed when the position closes
        modelsUsed: thesis.modelsUsed ?? {},
        createdAt: new Date().toISOString(),
      });

      setStage("success");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Unknown error during execution.";
      setErrorMsg(msg);
      setStage("error");
    }
  };

  // ── render helpers ─────────────────────────────────────────────────────────

  const predictedBand = bandLabel(option.predictedReturnPct);
  const isFundsError = errorMsg
    ? /insufficient|funds|gas|balance/i.test(errorMsg)
    : false;

  const dirClass =
    option.direction === "long"
      ? styles.long
      : option.direction === "short"
        ? styles.short
        : option.direction === "hedge"
          ? styles.hedge
          : styles.hold;

  return (
    <div
      className={styles.backdrop}
      ref={backdropRef}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Execute trade"
      >
        {/* Close button */}
        {stage !== "signing" && (
          <button
            className={styles.closeBtn}
            type="button"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        )}

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.kicker}>Execute trade</div>
          <div className={styles.title}>
            {dirLabel(option.direction)} {option.asset}
          </div>
        </div>

        {/* Option summary */}
        <div className={styles.summary}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Direction</span>
            <span className={`${styles.summaryValue} ${dirClass}`}>
              {dirLabel(option.direction)}
            </span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Asset</span>
            <span className={styles.summaryValue}>{option.asset}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Size</span>
            <span className={styles.summaryValue}>{moneyMUSD(option.sizeMUSD)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Predicted return</span>
            <span className={styles.summaryValue}>{predictedBand}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Spend cap</span>
            <span className={styles.summaryValue}>
              {moneyMUSD(policy.maxTradeMUSD)}
            </span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Slippage</span>
            <span className={styles.summaryValue}>0.5% (50 bps)</span>
          </div>
        </div>

        {/* Confirm stage */}
        {(stage === "confirm" || stage === "signing") && (
          <>
            {/* Wallet not created */}
            {!created && (
              <div className={`${styles.banner} ${styles.bannerInfo}`}>
                No agent wallet found. Create one in the{" "}
                <a href="/settings" style={{ color: "inherit", fontWeight: 600 }}>
                  Settings page
                </a>{" "}
                before executing.
              </div>
            )}

            {/* Passphrase input (wallet exists) */}
            {created && stage !== "signing" && (
              <div className={styles.passphraseSection}>
                <label className={styles.fieldLabel} htmlFor="exec-passphrase">
                  Wallet passphrase
                </label>
                <input
                  id="exec-passphrase"
                  ref={passphraseRef}
                  className={styles.inp}
                  type="password"
                  placeholder="Enter your agent wallet passphrase"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && passphrase.trim()) handleConfirm();
                  }}
                  autoComplete="current-password"
                />
              </div>
            )}

            {/* Signing spinner */}
            {stage === "signing" && (
              <div className={styles.spinWrap}>
                <div className={styles.spinner} aria-label="Signing transaction" />
                <div className={styles.spinLabel}>
                  Signing &amp; broadcasting on Mantle Sepolia…
                </div>
              </div>
            )}

            {/* Testnet notice */}
            <div className={styles.notice}>
              <WarnIcon />
              Testnet · Mantle Sepolia · not financial advice
            </div>

            {/* Actions */}
            {stage !== "signing" && (
              <div className={styles.actions}>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-gold"
                  type="button"
                  disabled={!created || !passphrase.trim()}
                  onClick={handleConfirm}
                >
                  Confirm &amp; Execute
                </button>
              </div>
            )}
          </>
        )}

        {/* Success stage */}
        {stage === "success" && result && (
          <div className={styles.success}>
            <div className={styles.successTitle}>Trade executed</div>

            <div className={styles.swapRow}>
              <span>{result.swap.amountIn}</span>
              <span className={styles.swapArrow}>→</span>
              <span>{result.swap.amountOut}</span>
            </div>

            <div className={styles.pnlNote}>
              <strong>Position opened.</strong> Realized PnL: pending (this is
              an opening trade; PnL is computed when the position closes).
              Predicted return band: <strong>{predictedBand}</strong>.
            </div>

            <a
              href={result.swap.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.mantleLink}
            >
              <ExternalLinkIcon />
              View on Mantlescan
            </a>

            <div className={styles.actions} style={{ marginTop: 18 }}>
              <button className="btn btn-ghost" type="button" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        )}

        {/* Error stage */}
        {stage === "error" && (
          <>
            <div className={`${styles.banner} ${styles.bannerError}`}>
              {errorMsg ?? "Execution failed."}
            </div>

            {isFundsError && address && (
              <>
                <div className={`${styles.banner} ${styles.bannerInfo}`}>
                  It looks like your agent wallet may not have enough funds. Fund
                  it via the wallet drawer or the Settings page.
                </div>
                <div className={styles.addrBox}>
                  Agent address: {address}
                </div>
              </>
            )}

            <div className={styles.notice}>
              <WarnIcon />
              Testnet · Mantle Sepolia · not financial advice
            </div>

            <div className={styles.actions}>
              <button className="btn btn-ghost" type="button" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn btn-gold"
                type="button"
                onClick={() => {
                  setStage("confirm");
                  setErrorMsg(null);
                }}
              >
                Retry
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
