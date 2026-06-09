// Static sample data for the Markets overview (T-414).
// No API calls yet - the market subagent feed wires in later.

export type BadgeKind = "mnt" | "btc" | "eth";

export interface Market {
  pair: string;
  /** URL-safe pair id used by /trade?pair=… */
  slug: string;
  name: string;
  badge: BadgeKind;
  /** glyph rendered inside the badge */
  glyph: string;
  /** price in mUSD, pre-formatted for display */
  price: string;
  /** numeric price for sorting */
  priceValue: number;
  change24h: number;
  volume: string;
  /** numeric 24h volume (mUSD) for sorting */
  volumeValue: number;
  /** sparkline polyline points (viewBox 0 0 200 36) */
  sparkPoints: string;
  defaultFavorite: boolean;
}

export const MARKETS: Market[] = [
  {
    pair: "mUSD/WMNT",
    slug: "mUSD-WMNT",
    name: "Wrapped Mantle",
    badge: "mnt",
    glyph: "W",
    price: "1.2843",
    priceValue: 1.2843,
    change24h: 4.21,
    volume: "$612.4K",
    volumeValue: 612_400,
    sparkPoints: "0,28 28,24 56,26 84,17 112,19 140,9 168,13 200,6",
    defaultFavorite: true,
  },
  {
    pair: "mUSD/BTC",
    slug: "mUSD-BTC",
    name: "Test Bitcoin",
    badge: "btc",
    glyph: "₿",
    price: "64,210.00",
    priceValue: 64_210,
    change24h: -1.08,
    volume: "$498.1K",
    volumeValue: 498_100,
    sparkPoints: "0,9 28,13 56,11 84,17 112,15 140,21 168,19 200,25",
    defaultFavorite: false,
  },
  {
    pair: "mUSD/ETH",
    slug: "mUSD-ETH",
    name: "Test Ether",
    badge: "eth",
    glyph: "Ξ",
    price: "3,488.40",
    priceValue: 3_488.4,
    change24h: 2.74,
    volume: "$251.7K",
    volumeValue: 251_700,
    sparkPoints: "0,22 28,20 56,23 84,14 112,16 140,13 168,8 200,11",
    defaultFavorite: false,
  },
];

export interface StripCard {
  slug: string;
  badge: BadgeKind;
  glyph: string;
  title: string;
  sub: string;
  change: string;
  direction: "up" | "down";
}

export const TOP_GAINERS: StripCard[] = [
  {
    slug: "mUSD-WMNT",
    badge: "mnt",
    glyph: "W",
    title: "mUSD/WMNT",
    sub: "1.2843 mUSD",
    change: "+4.21%",
    direction: "up",
  },
  {
    slug: "mUSD-ETH",
    badge: "eth",
    glyph: "Ξ",
    title: "mUSD/ETH",
    sub: "3,488.40 mUSD",
    change: "+2.74%",
    direction: "up",
  },
  {
    slug: "mUSD-WMNT",
    badge: "mnt",
    glyph: "W",
    title: "7d trend",
    sub: "steady uptrend",
    change: "+9.6%",
    direction: "up",
  },
];

export const TOP_LOSERS: StripCard[] = [
  {
    slug: "mUSD-BTC",
    badge: "btc",
    glyph: "₿",
    title: "mUSD/BTC",
    sub: "64,210.00 mUSD",
    change: "-1.08%",
    direction: "down",
  },
  {
    slug: "mUSD-BTC",
    badge: "btc",
    glyph: "₿",
    title: "7d trend",
    sub: "cooling off",
    change: "-2.3%",
    direction: "down",
  },
  {
    slug: "mUSD-ETH",
    badge: "eth",
    glyph: "Ξ",
    title: "1h move",
    sub: "3,488.40 mUSD",
    change: "-0.4%",
    direction: "down",
  },
];
