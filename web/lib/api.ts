/**
 * Typed fetch helpers for the Autonoe backend.
 * All routes are same-origin — Next.js rewrites /api/* to the bun backend.
 * On non-2xx, the helpers parse `{ error }` from the response body and throw
 * an Error with that message.
 */

import type {
  AIRole,
  AssetSymbol,
  ChatMessage,
  DebateResult,
  ProviderId,
  RoleModelMap,
  Thesis,
} from '@autonoe/shared';

import type {
  HistoryResponse,
  ModelsResponse,
  ProviderInfo,
  RolesResponse,
  SetKeyResponse,
} from '@autonoe/shared';

// ── helpers ──────────────────────────────────────────────────────────────────

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore parse errors — keep the HTTP status message
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

function post<B, T>(url: string, body: B): Promise<T> {
  return request<T>(url, { method: 'POST', body: JSON.stringify(body) });
}

function get<T>(url: string): Promise<T> {
  return request<T>(url);
}

// ── /api/thesis ───────────────────────────────────────────────────────────────

export interface PostThesisArgs {
  intent: string;
  activeSources: AIRole[];
}

export function postThesis(args: PostThesisArgs): Promise<Thesis> {
  return post<PostThesisArgs, Thesis>('/api/thesis', args);
}

// ── /api/thesis/human ─────────────────────────────────────────────────────────

export interface PostThesisHumanArgs {
  intent: string;
  body: string;
  suggestedPair: AssetSymbol;
}

export function postThesisHuman(args: PostThesisHumanArgs): Promise<Thesis> {
  return post<PostThesisHumanArgs, Thesis>('/api/thesis/human', args);
}

// ── /api/debate ───────────────────────────────────────────────────────────────

export function postDebate(thesis: Thesis): Promise<DebateResult> {
  return post<{ thesis: Thesis }, DebateResult>('/api/debate', { thesis });
}

// ── /api/assistant ────────────────────────────────────────────────────────────

export interface PostAssistantArgs {
  messages: ChatMessage[];
  context?: Record<string, unknown>;
}

export function postAssistant(args: PostAssistantArgs): Promise<ChatMessage> {
  return post<PostAssistantArgs, ChatMessage>('/api/assistant', args);
}

// ── /api/history ──────────────────────────────────────────────────────────────

export function getHistory(): Promise<HistoryResponse> {
  return get<HistoryResponse>('/api/history');
}

// ── /api/providers ────────────────────────────────────────────────────────────

export function getProviders(): Promise<ProviderInfo[]> {
  return get<ProviderInfo[]>('/api/providers');
}

// ── /api/models ───────────────────────────────────────────────────────────────

export function getModels(provider: ProviderId): Promise<ModelsResponse> {
  return get<ModelsResponse>(`/api/models?provider=${encodeURIComponent(provider)}`);
}

// ── /api/roles ────────────────────────────────────────────────────────────────

export function getRoles(): Promise<RolesResponse> {
  return get<RolesResponse>('/api/roles');
}

export function putRoles(roles: RoleModelMap): Promise<RolesResponse> {
  return request<RolesResponse>('/api/roles', {
    method: 'PUT',
    body: JSON.stringify(roles),
  });
}

// ── /api/keys ─────────────────────────────────────────────────────────────────

export interface PostKeyArgs {
  provider: ProviderId;
  apiKey: string;
}

export function postKey(args: PostKeyArgs): Promise<SetKeyResponse> {
  return post<PostKeyArgs, SetKeyResponse>('/api/keys', args);
}
