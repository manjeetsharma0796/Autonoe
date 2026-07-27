// Autonoe A2MCP service endpoint (free tier) for the OKX.AI marketplace.
// GET /api/service/arena?symbol=BTC
// -> a reproducible ARENA: strategy agents backtested vs a buy-and-hold baseline,
//    ranked into a leaderboard, the whole result hash-sealed and anchored on X
//    Layer when a funded ANCHOR_PRIVATE_KEY is set (otherwise anchor:null, still
//    a valid free response).
import type { NextRequest } from "next/server";
import { computeArena } from "@/lib/service/arena";
import { anchorSeal } from "@/lib/chain/anchor";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol") ?? "BTC";

  let result: Awaited<ReturnType<typeof computeArena>>;
  try {
    result = await computeArena({ symbol });
  } catch (e) {
    return Response.json({ error: (e as Error).message || "bad request", symbol }, { status: 400 });
  }
  const { arena, commitment, hash } = result;

  // Real X Layer seal - returns null (skipped cleanly) when the anchor key is
  // unset or unfunded, so the free arena never hard-fails on a chain issue.
  const anchor = await anchorSeal(hash);

  return Response.json({
    tier: "free",
    ...arena,
    commitHash: hash,
    commitment, // the exact canonical string that was hashed - recompute it yourself
    anchor, // { txHash, explorer } | null
    verify: "/api/service/verify",
    disclaimer:
      "Reproducible backtest on public market data, sealed for tamper-evidence. Not financial advice; past performance does not predict future results.",
  });
}
