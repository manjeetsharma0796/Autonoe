import { NextResponse } from "next/server";

/**
 * GET /api/symbols — live spot symbol list.
 *
 * Served from the web app (not the standalone bun backend) on purpose: the
 * backend sources this from api.bybit.com, which 403s from datacenter IPs, so
 * the deployed route hung for ~23s and then 502'd with "bybit tickers 403".
 * This mirrors the fix already applied to the arena engine — Binance's public
 * market-data host is globally reachable with no key and no geo-block.
 *
 * A filesystem route wins over the `/api/:path*` rewrite in next.config.ts, so
 * adding this file is enough to take the endpoint over.
 */

const TICKER_BASE = process.env.KLINE_BASE ?? "https://data-api.binance.vision";

/** Refresh the upstream list at most twice a minute; the UI polls far harder. */
const REVALIDATE_SECONDS = 30;

/** Only this base has an on-chain AMM leg on the testnet terminal. */
const ONCHAIN_BASES = new Set(["OKB"]);

/** Stablecoins and wrapped-dollar pairs: quoting them against USDT is noise. */
const QUOTE_LIKE = new Set([
  "USDC", "BUSD", "TUSD", "FDUSD", "DAI", "USDP", "EUR", "GBP", "AEUR", "USD1",
]);

interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
  highPrice: string;
  lowPrice: string;
}

export interface TokenInfoDTO {
  symbol: string;
  /** Upstream spot pair, e.g. "BTCUSDT". Field name kept for wire compat. */
  bybitSymbol: string;
  price: number;
  change24hPct: number;
  volume24h: number;
  /** 24h range — drives the terminal's stat strip so it can't go stale. */
  high24h: number;
  low24h: number;
  onchain: boolean;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toUpperCase();
  const limitRaw = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 80;

  let tokens: TokenInfoDTO[];
  try {
    tokens = await loadTokens();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "market data unreachable" },
      { status: 502 },
    );
  }

  const filtered = q ? tokens.filter((t) => t.symbol.includes(q)) : tokens;

  return NextResponse.json(filtered.slice(0, limit), {
    headers: {
      "cache-control": `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=120`,
    },
  });
}

/** Parsed + sorted token list, memoised in module scope. */
let cache: { at: number; tokens: TokenInfoDTO[] } | null = null;
let inflight: Promise<TokenInfoDTO[]> | null = null;

async function loadTokens(): Promise<TokenInfoDTO[]> {
  const now = Date.now();
  if (cache && now - cache.at < REVALIDATE_SECONDS * 1000) return cache.tokens;
  // Collapse concurrent misses onto one upstream call.
  if (inflight) return inflight;

  inflight = fetchTokens()
    .then((tokens) => {
      cache = { at: Date.now(), tokens };
      return tokens;
    })
    .catch((e) => {
      // Serve stale rather than 502 if we ever had a good list.
      if (cache) return cache.tokens;
      throw e;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

async function fetchTokens(): Promise<TokenInfoDTO[]> {
  // The full 24hr ticker is ~2.5MB — over Next's 2MB data-cache ceiling, so
  // caching the *response* fails noisily. Cache the parsed result instead and
  // let the CDN s-maxage header absorb repeat traffic.
  const res = await fetch(`${TICKER_BASE}/api/v3/ticker/24hr`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`market data ${res.status}`);

  const rows = (await res.json()) as BinanceTicker[];
  if (!Array.isArray(rows)) throw new Error("unexpected market payload");

  const tokens: TokenInfoDTO[] = [];
  for (const r of rows) {
    if (!r?.symbol?.endsWith("USDT")) continue;
    const base = r.symbol.slice(0, -4);
    // Leveraged tokens (BTCUPUSDT / BTCDOWNUSDT) and stable-vs-stable pairs
    // aren't real markets for this UI.
    if (!base || base.endsWith("UP") || base.endsWith("DOWN") || QUOTE_LIKE.has(base)) continue;

    const price = Number(r.lastPrice);
    const change24hPct = Number(r.priceChangePercent);
    const volume24h = Number(r.quoteVolume);
    if (!Number.isFinite(price) || price <= 0) continue;

    const high24h = Number(r.highPrice);
    const low24h = Number(r.lowPrice);

    tokens.push({
      symbol: base,
      bybitSymbol: r.symbol,
      price,
      change24hPct: Number.isFinite(change24hPct) ? change24hPct : 0,
      volume24h: Number.isFinite(volume24h) ? volume24h : 0,
      high24h: Number.isFinite(high24h) && high24h > 0 ? high24h : price,
      low24h: Number.isFinite(low24h) && low24h > 0 ? low24h : price,
      onchain: ONCHAIN_BASES.has(base),
    });
  }

  tokens.sort((a, b) => b.volume24h - a.volume24h);
  return tokens;
}
