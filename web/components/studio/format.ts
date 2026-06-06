// Display helpers mapping the shared API domain types to the studio UI.

import type { Direction } from "@autonoe/shared";

export function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function dirLabel(d: Direction): string {
  return titleCase(d);
}

export function signed(pct: number): string {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

export function bandLabel(b: { low: number; high: number }): string {
  return `${signed(b.low)} to ${signed(b.high)}`;
}

export function moneyMUSD(n: number): string {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 0 })} mUSD`;
}
