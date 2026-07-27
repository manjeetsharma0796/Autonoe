// Stateless verification for an Autonoe arena verdict. POST the verdict JSON you
// received; we recompute its keccak256 seal and, if an anchor tx is present,
// confirm that seal is the exact calldata recorded on X Layer.
import type { NextRequest } from "next/server";
import type { Hex } from "viem";
import { hashSeal } from "@/lib/commitment";
import { getAnchoredHash } from "@/lib/chain/read";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  // Strip the response envelope; what remains is exactly the object that was hashed.
  const {
    commitHash,
    commitment: _commitment,
    anchor,
    verify: _verify,
    disclaimer: _disclaimer,
    tier: _tier,
    anchorTx,
    ...verdict
  } = body;

  const recomputed = hashSeal(verdict);
  const provided = typeof commitHash === "string" ? commitHash : undefined;
  const matchesProvided = provided ? recomputed.toLowerCase() === provided.toLowerCase() : null;

  let onChain: { txHash: string; calldataHash: string; matches: boolean } | null = null;
  const tx =
    (typeof anchorTx === "string" && anchorTx) ||
    (anchor && typeof (anchor as { txHash?: unknown }).txHash === "string"
      ? (anchor as { txHash: string }).txHash
      : undefined);
  if (tx) {
    const calldataHash = await getAnchoredHash(tx as Hex);
    if (calldataHash) {
      onChain = { txHash: tx, calldataHash, matches: calldataHash.toLowerCase() === recomputed.toLowerCase() };
    }
  }

  return Response.json({ recomputed, matchesProvided, onChain });
}
