// Hash helpers for the execute flow (T-409).
//
// We need deterministic 32-byte keccak256 hashes to pass to `executeOption`
// as `thesisHash` and `verdictHash`. These are identity hashes — not
// cryptographic proofs — for the on-chain DecisionLog provenance record.
//
// Strategy:
//   - Select a minimal stable subset of the thesis (id, intent, suggestedPair,
//     option ids in sorted order). We deliberately exclude computed/mutable
//     fields (traces, modelsUsed) so the hash is stable across re-renders.
//   - For verdictHash: hash a stable subset of the DebateResult. When no
//     judge path was used, hash a sentinel string ("no-verdict") so the call
//     still receives a valid 32-byte hex.
//   - JSON.stringify with sorted keys via a replacer for determinism.
//   - keccak256(toHex(jsonString)) — viem provides both utilities.

import { keccak256, toHex } from 'viem';
import type { Thesis, DebateResult } from '@autonoe/shared';

/** Sort object keys recursively for deterministic JSON serialisation. */
function sortedJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(sortedJson).join(',') + ']';
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const pairs = keys.map((k) => `${JSON.stringify(k)}:${sortedJson(obj[k])}`);
  return '{' + pairs.join(',') + '}';
}

/**
 * Derive a stable 32-byte keccak256 hash for a thesis.
 *
 * Subset used (mutable/noisy fields excluded):
 *   id, intent, source, suggestedPair, option ids (sorted), createdAt
 */
export function thesisHash(thesis: Thesis): `0x${string}` {
  const subset = {
    id: thesis.id,
    intent: thesis.intent,
    source: thesis.source,
    suggestedPair: thesis.suggestedPair,
    optionIds: thesis.options.map((o) => o.id).sort(),
    createdAt: thesis.createdAt,
  };
  return keccak256(toHex(sortedJson(subset)));
}

/**
 * Derive a stable 32-byte keccak256 hash for a debate result (verdict).
 *
 * When no judge path was used, pass `null` or `undefined` and the sentinel
 * "no-verdict" is hashed — still a valid 32-byte hex for on-chain storage.
 */
export function verdictHash(verdict: DebateResult | null | undefined): `0x${string}` {
  if (!verdict) {
    return keccak256(toHex('no-verdict'));
  }
  const subset = {
    thesisId: verdict.thesisId,
    judgeSummary: verdict.judgeSummary,
    refinedOptions: verdict.refinedOptions
      .map((o) => ({ optionRef: o.optionRef, risk: o.risk, confidence: o.confidence }))
      .sort((a, b) => a.optionRef.localeCompare(b.optionRef)),
  };
  return keccak256(toHex(sortedJson(subset)));
}
