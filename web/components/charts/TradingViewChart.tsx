'use client';

/**
 * TradingView Advanced Chart widget — full default UI (timeframes, indicators,
 * drawing tools). Renders real market data for the asset's USDT pair. Used on
 * /trade and the /studio verdict view.
 */
import { useEffect, useRef } from 'react';

const TV_SYMBOL: Record<string, string> = {
  WMNT: 'BYBIT:MNTUSDT', // WMNT wraps MNT
  BTC: 'BINANCE:BTCUSDT',
  ETH: 'BINANCE:ETHUSDT',
  SUI: 'BINANCE:SUIUSDT',
  SOL: 'BINANCE:SOLUSDT',
};

function tvSymbol(asset: string): string {
  return TV_SYMBOL[asset] ?? `BINANCE:${asset.toUpperCase()}USDT`;
}

export interface TradingViewChartProps {
  asset: string;
  /** Pixel height; use a number for fixed, or pass via style for responsive. */
  height?: number;
  interval?: string; // '60', 'D', etc.
}

export function TradingViewChart({ asset, height = 460, interval = '60' }: TradingViewChartProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    host.innerHTML = '';

    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget';
    widget.style.height = '100%';
    widget.style.width = '100%';
    host.appendChild(widget);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.type = 'text/javascript';
    script.innerHTML = JSON.stringify({
      symbol: tvSymbol(asset),
      interval,
      theme: 'dark',
      style: '1',
      timezone: 'Etc/UTC',
      locale: 'en',
      autosize: true,
      allow_symbol_change: true,
      withdateranges: true,
      hide_side_toolbar: false,
      details: false,
      backgroundColor: 'rgba(11, 14, 20, 1)',
      gridColor: 'rgba(255, 255, 255, 0.06)',
    });
    host.appendChild(script);

    return () => {
      host.innerHTML = '';
    };
  }, [asset, interval]);

  return (
    <div
      className="tradingview-widget-container"
      ref={ref}
      style={{ height, width: '100%', borderRadius: 12, overflow: 'hidden' }}
    />
  );
}
