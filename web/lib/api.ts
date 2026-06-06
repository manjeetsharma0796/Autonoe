// Typed client for the bun backend (PRD §12). All calls go through Next's
// `/api/*` rewrite to the server. Used to replace the studio/rail mock data
// with live thesis + debate + assistant responses (T-601).

import {
  API,
  type AssetSymbol,
  type ChatMessage,
  type DebateResult,
  type Thesis,
} from "@autonoe/shared";

/** Thrown on a non-2xx response; `message` is the server's `error` field. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function postJSON<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    throw new ApiError("Can't reach the Autonoe server — is it running?", 0);
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j?.error) message = j.error;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(message, res.status);
  }
  return (await res.json()) as T;
}

/** AI-authored thesis. `activeSources` are full role ids (subagent.*). */
export function generateThesis(
  intent: string,
  activeSources: string[],
  signal?: AbortSignal,
): Promise<Thesis> {
  return postJSON<Thesis>(API.thesis, { intent, activeSources }, signal);
}

/** Structure a human-written case into risk-tiered options. */
export function structureHumanThesis(
  input: { intent: string; body: string; suggestedPair: AssetSymbol },
  signal?: AbortSignal,
): Promise<Thesis> {
  return postJSON<Thesis>(API.thesisHuman, input, signal);
}

/** Run the Supporter → Discriminator → Judge debate over a thesis. */
export function runDebate(thesis: Thesis, signal?: AbortSignal): Promise<DebateResult> {
  return postJSON<DebateResult>(API.debate, { thesis }, signal);
}

/** One assistant turn; returns the full reply message. */
export function chatAssistant(
  messages: ChatMessage[],
  context?: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<ChatMessage> {
  return postJSON<ChatMessage>(API.assistant, { messages, context }, signal);
}
