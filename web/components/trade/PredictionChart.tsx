"use client";

// Interactive price chart (T-415). Real OHLCV candles from `/api/candles`
// (Bybit spot via the server market layer — the UI never calls Bybit directly),
// rendered with TradingView lightweight-charts. When a `prediction` is supplied
// (the selected thesis/Judge option) it overlays an entry line, the predicted-
// return band (low/high target price lines), and a target marker. A crosshair
// tooltip reports the OHLC under the cursor.
//
// Used on /trade (ChartPanel) and the /studio verdict view (StepJudge).

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { AssetSymbol, Candle } from "@autonoe/shared";

export interface Prediction {
  direction: "long" | "short";
  /** Predicted-return band, percent (e.g. 6.4 → +6.4%). */
  lowPct: number;
  highPct: number;
  /** Anchor price; defaults to the latest close when omitted. */
  entryPrice?: number;
  label?: string;
}

const UP = "#3FE0A6";
const DOWN = "#FF6B6B";
const GOLD = "#F5A524";
const GOLD2 = "#FFCC66";

function signed(pct: number): string {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

/** entry adjusted by a signed return for the given direction. */
function targetPrice(entry: number, pct: number, dir: "long" | "short"): number {
  const move = (pct / 100) * (dir === "long" ? 1 : -1);
  return entry * (1 + move);
}

interface HoverInfo {
  o: number;
  h: number;
  l: number;
  c: number;
}

export function PredictionChart({
  asset,
  interval = "240",
  prediction,
  height = 340,
}: {
  asset: AssetSymbol;
  interval?: string;
  prediction?: Prediction;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [hover, setHover] = useState<HoverInfo | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let disposed = false;
    const controller = new AbortController();

    const chart: IChartApi = createChart(el, {
      width: el.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8c9ab3",
        fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.06)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.08)" },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const series: ISeriesApi<"Candlestick"> = chart.addCandlestickSeries({
      upColor: UP,
      downColor: DOWN,
      borderVisible: false,
      wickUpColor: UP,
      wickDownColor: DOWN,
    });

    chart.subscribeCrosshairMove((param) => {
      const d = param.seriesData.get(series) as CandlestickData | undefined;
      if (!param.time || !d) {
        setHover(null);
        return;
      }
      setHover({ o: d.open, h: d.high, l: d.low, c: d.close });
    });

    const ro = new ResizeObserver(() => {
      if (!disposed) chart.applyOptions({ width: el.clientWidth });
    });
    ro.observe(el);

    (async () => {
      try {
        const res = await fetch(
          `/api/candles?asset=${asset}&interval=${interval}&limit=200`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(`candles ${res.status}`);
        const candles = (await res.json()) as Candle[];
        if (disposed || candles.length === 0) {
          if (!disposed) setStatus("error");
          return;
        }

        const data: CandlestickData[] = candles.map((c) => ({
          time: (Math.floor(c.time / 1000) as UTCTimestamp),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));
        series.setData(data);
        chart.timeScale().fitContent();

        if (prediction) {
          const last = candles[candles.length - 1]!;
          const entry = prediction.entryPrice ?? last.close;
          const low = targetPrice(entry, prediction.lowPct, prediction.direction);
          const high = targetPrice(entry, prediction.highPct, prediction.direction);

          series.createPriceLine({
            price: entry,
            color: GOLD2,
            lineWidth: 1,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: "entry",
          });
          series.createPriceLine({
            price: low,
            color: GOLD,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: signed(prediction.lowPct),
          });
          series.createPriceLine({
            price: high,
            color: GOLD,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: signed(prediction.highPct),
          });

          series.setMarkers([
            {
              time: data[data.length - 1]!.time,
              position: prediction.direction === "long" ? "aboveBar" : "belowBar",
              color: GOLD2,
              shape: prediction.direction === "long" ? "arrowUp" : "arrowDown",
              text: prediction.label ?? `target ${signed(prediction.highPct)}`,
            },
          ]);
        }

        if (!disposed) setStatus("ready");
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        if (!disposed) setStatus("error");
      }
    })();

    return () => {
      disposed = true;
      controller.abort();
      ro.disconnect();
      chart.remove();
    };
  }, [asset, interval, prediction, height]);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div ref={containerRef} style={{ width: "100%", height }} />

      {hover && (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            display: "flex",
            gap: 12,
            padding: "6px 10px",
            borderRadius: 8,
            background: "rgba(8,11,18,0.82)",
            border: "1px solid rgba(255,255,255,0.08)",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: 11,
            color: "#f4f7fb",
            pointerEvents: "none",
          }}
        >
          <span>O {hover.o}</span>
          <span>H {hover.h}</span>
          <span>L {hover.l}</span>
          <span style={{ color: hover.c >= hover.o ? UP : DOWN }}>C {hover.c}</span>
        </div>
      )}

      {prediction && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            padding: "4px 9px",
            borderRadius: 999,
            background: "linear-gradient(100deg, rgba(245,165,36,0.18), rgba(255,204,102,0.10))",
            border: "1px solid rgba(245,165,36,0.5)",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: 10,
            letterSpacing: "0.04em",
            color: GOLD2,
            pointerEvents: "none",
          }}
        >
          predicted {signed(prediction.lowPct)} → {signed(prediction.highPct)}
        </div>
      )}

      {status !== "ready" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: 12,
            color: "#8c9ab3",
            pointerEvents: "none",
          }}
        >
          {status === "loading" ? "Loading live candles…" : "Live candles unavailable — start the server to load market data."}
        </div>
      )}
    </div>
  );
}
