"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./share.module.css";

export interface ShareStat {
  label: string;
  value: string;
}

export interface ShareCardData {
  kind: "thesis" | "verdict";
  /** Headline (e.g. the preferred option / thesis title). */
  title: string;
  /** One-line context under the title (pair, intent…). */
  subtitle?: string;
  /** Pills: predicted %, risk, confidence… */
  stats?: ShareStat[];
}

const CARD_W = 1200;
const CARD_H = 630;

// ── encode/decode for the shareable deep link ────────────────────────────────
function encode(data: ShareCardData): string {
  const json = JSON.stringify(data);
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildLink(data: ShareCardData): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://autonoe";
  return `${origin}/studio#card=${encode(data)}`;
}

// ── canvas card rendering ─────────────────────────────────────────────────────
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawCard(ctx: CanvasRenderingContext2D, data: ShareCardData) {
  const GOLD = "#f5a524";
  const VIOLET = "#b79cff";
  const MUTED = "#8c9ab3";
  const sans = "system-ui, -apple-system, Segoe UI, sans-serif";
  const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

  // Background
  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  bg.addColorStop(0, "#080b12");
  bg.addColorStop(1, "#0c111c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Top accent bar (gold → violet)
  const bar = ctx.createLinearGradient(0, 0, CARD_W, 0);
  bar.addColorStop(0, GOLD);
  bar.addColorStop(1, "#8b5cf6");
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, CARD_W, 6);

  const pad = 72;

  // Brand
  ctx.fillStyle = GOLD;
  ctx.font = `700 30px ${sans}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText("AUTONOE", pad, 96);
  ctx.fillStyle = MUTED;
  ctx.font = `500 16px ${mono}`;
  ctx.fillText("AI TRADING TRIBUNAL", pad + 168, 96);

  // Kind label
  ctx.fillStyle = VIOLET;
  ctx.font = `600 20px ${mono}`;
  ctx.fillText(data.kind === "verdict" ? "VERDICT" : "THESIS", pad, 184);

  // Title (wrapped, up to 3 lines)
  ctx.fillStyle = "#eef2fb";
  ctx.font = `700 60px ${sans}`;
  const titleLines = wrap(ctx, data.title, CARD_W - pad * 2).slice(0, 3);
  let y = 252;
  for (const line of titleLines) {
    ctx.fillText(line, pad, y);
    y += 70;
  }

  // Subtitle
  if (data.subtitle) {
    ctx.fillStyle = MUTED;
    ctx.font = `400 26px ${sans}`;
    const subLines = wrap(ctx, data.subtitle, CARD_W - pad * 2).slice(0, 2);
    y += 6;
    for (const line of subLines) {
      ctx.fillText(line, pad, y);
      y += 36;
    }
  }

  // Stat pills
  if (data.stats?.length) {
    let x = pad;
    const py = CARD_H - 132;
    ctx.font = `600 22px ${mono}`;
    for (const s of data.stats) {
      const text = `${s.label} ${s.value}`;
      const w = ctx.measureText(text).width + 40;
      ctx.fillStyle = "rgba(139,92,246,0.12)";
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1;
      const r = 14;
      ctx.beginPath();
      ctx.roundRect(x, py, w, 50, r);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = VIOLET;
      ctx.fillText(text, x + 20, py + 33);
      x += w + 14;
      if (x > CARD_W - pad) break;
    }
  }

  // Footer
  ctx.fillStyle = MUTED;
  ctx.font = `400 18px ${mono}`;
  ctx.fillText(
    "Mantle Sepolia · testnet · not financial advice",
    pad,
    CARD_H - 44,
  );
}

// ── icons ─────────────────────────────────────────────────────────────────────
function ShareIcon() {
  return (
    <svg className={styles.ic} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ShareButton({
  data,
  className,
}: {
  data: ShareCardData;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Draw the preview whenever the popover opens or the data changes.
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      canvas.width = CARD_W;
      canvas.height = CARD_H;
      drawCard(ctx, data);
    }
  }, [open, data]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildLink(data));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable (e.g. insecure context) — no-op */
    }
  }, [data]);

  const downloadImage = useCallback(() => {
    const render = document.createElement("canvas");
    render.width = CARD_W;
    render.height = CARD_H;
    const ctx = render.getContext("2d");
    if (!ctx) return;
    drawCard(ctx, data);
    render.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `autonoe-${data.kind}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [data]);

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={className ? `${styles.btn} ${className}` : styles.btn}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <ShareIcon />
        Share
      </button>

      {open ? (
        <div className={styles.pop} role="dialog" aria-label="Share card">
          <canvas ref={canvasRef} className={styles.preview} />
          <div className={styles.actions}>
            <button
              type="button"
              className={copied ? `${styles.action} ${styles.copied}` : styles.action}
              onClick={copyLink}
            >
              {copied ? "Link copied ✓" : "Copy link"}
            </button>
            <button type="button" className={styles.action} onClick={downloadImage}>
              Download image
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
