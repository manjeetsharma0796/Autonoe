"use client";

import { useEffect, useRef, useState } from "react";
import type { Pair } from "./data";

function Caret() {
  return (
    <svg
      className="car"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PairSelector({
  pair,
  pairs,
  onSelect,
}: {
  pair: Pair;
  /** Live pair list; falls back to the current pair if empty. */
  pairs: Pair[];
  onSelect: (sym: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [open]);

  return (
    <div className={`pairsel ${open ? "open" : ""}`} ref={ref}>
      <button
        type="button"
        className="pairbtn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <span className="b">{pair.badge}</span>
        <span className="pname">
          mUSD/{pair.sym} <small>{pair.sub}</small>
        </span>
        <Caret />
      </button>

      <div className="pairmenu" role="listbox">
        {(pairs.length ? pairs : [pair]).map((p) => (
          <button
            type="button"
            role="option"
            aria-selected={p.sym === pair.sym}
            className="pairopt"
            key={p.sym}
            onClick={() => {
              onSelect(p.sym);
              setOpen(false);
            }}
          >
            <span className="b">{p.badge}</span>
            <div className="m">
              <b>mUSD/{p.sym}</b>
              <small>{p.sub}</small>
            </div>
            <span className={`pp ${p.dir}`}>{p.px}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
