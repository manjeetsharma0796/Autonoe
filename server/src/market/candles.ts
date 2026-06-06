// Candle endpoint logic (backs `GET /api/candles`). Kept separate from the
// Express wiring so it can be unit-tested with an injected fetcher (no network).
// The UI hits this instead of calling Bybit directly (T-415).

import { ASSET_SYMBOLS, type AssetSymbol } from '@autonoe/shared';
import { getKline, type Candle, type Fetcher } from './bybit.ts';

/** Bybit-supported spot kline intervals (minutes, plus day/week). */
const ALLOWED_INTERVALS = new Set([
  '1', '3', '5', '15', '30', '60', '120', '240', '360', '720', 'D', 'W',
]);

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 150;

export interface CandlesQueryInput {
  asset?: unknown;
  interval?: unknown;
  limit?: unknown;
}

function badRequest(message: string): Error {
  return Object.assign(new Error(message), { status: 400 });
}

/**
 * Validate a candles query and fetch the bars. Throws a 400-tagged error on
 * bad input; bubbles getKline's 502 on upstream failure.
 */
export async function fetchCandles(q: CandlesQueryInput, f?: Fetcher): Promise<Candle[]> {
  const asset = q.asset as AssetSymbol;
  if (!asset || !ASSET_SYMBOLS.includes(asset)) {
    throw badRequest('valid asset query param required (WMNT|MockBTC|MockETH)');
  }

  const interval = q.interval ? String(q.interval) : '60';
  if (!ALLOWED_INTERVALS.has(interval)) {
    throw badRequest(`unsupported interval "${interval}"`);
  }

  const requested = Number(q.limit);
  const limit = Number.isFinite(requested)
    ? Math.min(Math.max(Math.trunc(requested), 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  return f ? getKline(asset, interval, limit, f) : getKline(asset, interval, limit);
}
