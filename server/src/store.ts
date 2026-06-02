// T-201 — tiny key/value store on bun:sqlite (Mono pattern), plus encrypted
// storage for provider API keys. Single source of truth for server-side state.

import { Database } from 'bun:sqlite';
import { encrypt, decrypt } from './crypto.ts';
import type { ProviderId, RoleModelMap } from '@autonoe/shared';

const db = new Database(process.env.AUTONOE_DB ?? 'autonoe.db');
db.exec('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)');

const getStmt = db.query<{ value: string }, [string]>('SELECT value FROM kv WHERE key = ?');
const setStmt = db.query(
  'INSERT INTO kv(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
);
const delStmt = db.query('DELETE FROM kv WHERE key = ?');

export const kv = {
  get(key: string): string | null {
    return getStmt.get(key)?.value ?? null;
  },
  set(key: string, value: string): void {
    setStmt.run(key, value);
  },
  del(key: string): void {
    delStmt.run(key);
  },
  getJSON<T>(key: string): T | null {
    const raw = this.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  setJSON(key: string, value: unknown): void {
    this.set(key, JSON.stringify(value));
  },
};

// ── Provider API keys (encrypted at rest) ────────────────────────────────────

const keyName = (p: ProviderId) => `provider_key:${p}`;

export function setProviderKey(provider: ProviderId, apiKey: string): void {
  kv.set(keyName(provider), encrypt(apiKey));
}

export function getProviderKey(provider: ProviderId): string | null {
  const enc = kv.get(keyName(provider));
  return enc ? decrypt(enc) : null;
}

export function hasProviderKey(provider: ProviderId): boolean {
  return kv.get(keyName(provider)) !== null;
}

// ── Role → model config ──────────────────────────────────────────────────────

const ROLES_KEY = 'role_model_map';

export function getRoles(): RoleModelMap | null {
  return kv.getJSON<RoleModelMap>(ROLES_KEY);
}

export function setRoles(map: RoleModelMap): void {
  kv.setJSON(ROLES_KEY, map);
}
