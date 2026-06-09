"use client";

import { useMemo, useState } from "react";
import { SLIPPAGES, formatTo, type Pair } from "./data";
import { Button } from "@/components/ui/Button";

function FlipIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 4v13M7 17l-3-3M7 17l3-3M17 20V7M17 7l-3 3M17 7l3 3" />
    </svg>
  );
}

function Caret() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path
        d="M12 8h.01M11 12h1v4h1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/,/g, "")) || 0;
}

export function SwapBox({ pair }: { pair: Pair }) {
  const [fromRaw, setFromRaw] = useState("1,000");
  const [slip, setSlip] = useState("0.5%");

  const fromNum = useMemo(() => parseAmount(fromRaw), [fromRaw]);
  const toOut = useMemo(() => fromNum * pair.rate, [fromNum, pair.rate]);
  const toStr = useMemo(() => formatTo(fromNum, pair.rate), [fromNum, pair.rate]);

  const slipNum = useMemo(() => parseFloat(slip) / 100, [slip]);
  const minReceived = useMemo(
    () =>
      (toOut * (1 - slipNum)).toLocaleString(undefined, {
        maximumFractionDigits: pair.rate < 0.01 ? 6 : 2,
      }),
    [toOut, slipNum, pair.rate]
  );
  const rateStr = useMemo(
    () =>
      pair.rate.toLocaleString(undefined, {
        maximumFractionDigits: pair.rate < 0.01 ? 8 : 4,
      }),
    [pair.rate]
  );

  return (
    <section className="panel">
      <div className="phead">
        <span className="lab">Swap · Execute</span>
      </div>
      <div className="pbody">
        <div className="swapfield">
          <div className="sf-top">
            <span>From</span>
            <span className="bal">Balance: 12,500.00 mUSD</span>
          </div>
          <div className="sf-main">
            <input
              className="sf-amt"
              type="text"
              inputMode="decimal"
              value={fromRaw}
              onChange={(e) => setFromRaw(e.target.value)}
              aria-label="From amount"
            />
            <div className="sf-asset">
              <span className="b">$</span>
              <span className="a">mUSD</span>
            </div>
          </div>
        </div>

        <div className="swapmid">
          <button type="button" aria-label="Flip direction">
            <FlipIcon />
          </button>
        </div>

        <div className="swapfield">
          <div className="sf-top">
            <span>To (estimated)</span>
            <span className="bal">Balance: 318.40 {pair.sym}</span>
          </div>
          <div className="sf-main">
            <input
              className="sf-amt"
              type="text"
              value={toStr}
              readOnly
              aria-label="To amount"
            />
            <div className="sf-asset">
              <span className="b">{pair.badge}</span>
              <span className="a">{pair.sym}</span>
              <Caret />
            </div>
          </div>
        </div>

        <div className="summary">
          <div className="srow">
            <span>Rate</span>
            <span className="v">
              1 mUSD = {rateStr} {pair.sym}
            </span>
          </div>
          <div className="srow">
            <span>Min. received</span>
            <span className="v">
              {minReceived} {pair.sym}
            </span>
          </div>
          <div className="srow">
            <span>Network fee</span>
            <span className="v">~0.0012 MNT</span>
          </div>
          <div className="srow">
            <span>Route</span>
            <span className="v violet">
              mUSD → {pair.sym} · MockDEX
            </span>
          </div>
          <div className="slip">
            <span className="lab">Slippage tolerance</span>
            <div className="slipchips">
              {SLIPPAGES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`chip ${s === slip ? "on" : ""}`}
                  onClick={() => setSlip(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="note">
          <InfoIcon />
          <span>
            Output is estimated at <b>{slip}</b> slippage. The agent wallet will
            revert if you receive less than the minimum. Testnet only - not
            financial advice.
          </span>
        </div>

        <Button variant="gold" size="lg" block style={{ marginTop: 16 }}>
          Execute swap →
        </Button>
      </div>
    </section>
  );
}
