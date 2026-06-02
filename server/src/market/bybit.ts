// Bybit v5 public market data (no API key needed for spot kline/tickers).
// Our tradable assets map to Bybit spot symbols; WMNT analyses use MNTUSDT
// (MNT is what WMNT wraps) while the on-chain AMM remains the execution truth.

import type { AssetSymbol } from '@autonoe/shared';

const BASE = process.env.BYBIT_BASE ?? 'https://api.bybit.com';

export const BYBIT_SYMBOL: Record<AssetSymbol, string> = {
  WMNT: 'MNTUSDT',
  MockBTC: 'BTCUSDT',
  MockETH: 'ETHUSDT',
};

export interface Candle {
  time: number; // ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Ticker {
  price: number;
  change24hPct: number; // percent, e.g. 4.21
  volume24h: number;
}

/** Injectable fetcher so tests can supply fixtures without network. */
export type Fetcher = (url: string) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;
const defaultFetcher: Fetcher = (url) => fetch(url);

interface KlineResp {
  result?: { list?: string[][] };
}
interface TickerResp {
  result?: { list?: Array<{ lastPrice?: string; price24hPcnt?: string; volume24h?: string }> };
}

/** Spot candles, returned oldest→newest. interval in minutes ('60') or 'D'. */
export async function getKline(
  asset: AssetSymbol,
  interval = '60',
  limit = 100,
  f: Fetcher = defaultFetcher,
): Promise<Candle[]> {
  const url = `${BASE}/v5/market/kline?category=spot&symbol=${BYBIT_SYMBOL[asset]}&interval=${interval}&limit=${limit}`;
  const res = await f(url);
  if (!res.ok) throw Object.assign(new Error(`bybit kline ${res.status}`), { status: 502 });
  const json = (await res.json()) as KlineResp;
  const list = json.result?.list ?? [];
  // Bybit returns newest-first: [start, open, high, low, close, volume, turnover]
  return list
    .map((r) => ({
      time: Number(r[0]),
      open: Number(r[1]),
      high: Number(r[2]),
      low: Number(r[3]),
      close: Number(r[4]),
      volume: Number(r[5]),
    }))
    .reverse();
}

export async function getTicker(asset: AssetSymbol, f: Fetcher = defaultFetcher): Promise<Ticker> {
  const url = `${BASE}/v5/market/tickers?category=spot&symbol=${BYBIT_SYMBOL[asset]}`;
  const res = await f(url);
  if (!res.ok) throw Object.assign(new Error(`bybit ticker ${res.status}`), { status: 502 });
  const json = (await res.json()) as TickerResp;
  const t = json.result?.list?.[0];
  if (!t) throw Object.assign(new Error('bybit ticker empty'), { status: 502 });
  return {
    price: Number(t.lastPrice),
    change24hPct: Number(t.price24hPcnt) * 100,
    volume24h: Number(t.volume24h),
  };
}

export const closes = (candles: Candle[]): number[] => candles.map((c) => c.close);
