"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AI_ROLES,
  API,
  PROVIDER_IDS,
  SUBAGENT_ROLES,
  type AIRole,
  type ModelInfo,
  type ProviderId,
  type ProviderInfo,
  type RoleModelMap,
} from "@autonoe/shared";
import styles from "./settings.module.css";

// Graceful fallback so the page is useful before the backend is running;
// /api/providers overrides label/keysUrl/note when reachable.
const PROVIDER_META: Record<
  ProviderId,
  { label: string; keysUrl: string; note: string }
> = {
  groq: {
    label: "Groq",
    keysUrl: "https://console.groq.com/keys",
    note: "Free tier · very fast LPU inference",
  },
  mistral: {
    label: "Mistral",
    keysUrl: "https://console.mistral.ai/api-keys",
    note: "Free tier available",
  },
  nvidia: {
    label: "NVIDIA NIM",
    keysUrl: "https://build.nvidia.com",
    note: "Free API credits to start",
  },
  openrouter: {
    label: "OpenRouter",
    keysUrl: "https://openrouter.ai/keys",
    note: "Many :free models, one key",
  },
  gemini: {
    label: "Google Gemini",
    keysUrl: "https://aistudio.google.com/apikey",
    note: "Free tier via Google AI Studio",
  },
};

const ROLE_LABELS: Record<AIRole, string> = {
  thesis: "Thesis",
  "subagent.onchain": "Subagent · On-chain",
  "subagent.market": "Subagent · Market",
  "subagent.news": "Subagent · News",
  "subagent.indicators": "Subagent · Indicators",
  assistant: "Assistant",
  supporter: "Supporter",
  discriminator: "Discriminator",
  judge: "Judge",
};

const ROLE_SUBLABEL: Partial<Record<AIRole, string>> = {
  assistant: "trade-page chat rail",
  thesis: "drafts the multi-option thesis",
  supporter: "argues for the thesis",
  discriminator: "argues against it",
  judge: "issues the verdict",
};

const SOURCE_LABELS: Record<(typeof SUBAGENT_ROLES)[number], string> = {
  "subagent.onchain": "On-chain",
  "subagent.market": "Market data",
  "subagent.news": "News / web",
  "subagent.indicators": "Indicators",
};

const SOURCES_KEY = "autonoe:activeSources";

function encodeChoice(provider: ProviderId, model: string) {
  return `${provider}::${model}`;
}

export function SettingsClient() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [models, setModels] = useState<Partial<Record<ProviderId, ModelInfo[]>>>(
    {},
  );
  const [roles, setRoles] = useState<RoleModelMap | null>(null);
  const [drafts, setDrafts] = useState<Partial<Record<ProviderId, string>>>({});
  const [saving, setSaving] = useState<ProviderId | null>(null);
  const [active, setActive] = useState<Set<AIRole>>(
    () => new Set(SUBAGENT_ROLES),
  );
  const [offline, setOffline] = useState(false);

  const loadModels = useCallback(async (provider: ProviderId) => {
    try {
      const res = await fetch(`${API.models}?provider=${provider}`);
      if (!res.ok) return;
      const data = (await res.json()) as ModelInfo[];
      setModels((m) => ({ ...m, [provider]: data }));
    } catch {
      /* backend unreachable */
    }
  }, []);

  // Initial load: providers + roles + each provider's models.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pRes, rRes] = await Promise.all([
          fetch(API.providers),
          fetch(API.roles),
        ]);
        if (!cancelled && pRes.ok) {
          setProviders((await pRes.json()) as ProviderInfo[]);
        }
        if (!cancelled && rRes.ok) {
          setRoles((await rRes.json()) as RoleModelMap);
        }
        if (!pRes.ok || !rRes.ok) setOffline(true);
      } catch {
        if (!cancelled) setOffline(true);
      }
      PROVIDER_IDS.forEach((p) => void loadModels(p));
    })();

    try {
      const stored = localStorage.getItem(SOURCES_KEY);
      if (stored) setActive(new Set(JSON.parse(stored) as AIRole[]));
    } catch {
      /* ignore */
    }
    return () => {
      cancelled = true;
    };
  }, [loadModels]);

  const saveKey = useCallback(
    async (provider: ProviderId) => {
      const apiKey = (drafts[provider] ?? "").trim();
      if (!apiKey) return;
      setSaving(provider);
      try {
        const res = await fetch(API.keys, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ provider, apiKey }),
        });
        if (res.ok) {
          setProviders((ps) =>
            ps.map((p) => (p.id === provider ? { ...p, hasKey: true } : p)),
          );
          setDrafts((d) => ({ ...d, [provider]: "" }));
          await loadModels(provider); // auto-populate models on paste/save
        }
      } catch {
        setOffline(true);
      } finally {
        setSaving(null);
      }
    },
    [drafts, loadModels],
  );

  const setRole = useCallback(
    (role: AIRole, value: string) => {
      if (!roles) return;
      const [provider, model] = value.split("::") as [ProviderId, string];
      const next: RoleModelMap = { ...roles, [role]: { provider, model } };
      setRoles(next);
      void fetch(API.roles, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      }).catch(() => setOffline(true));
    },
    [roles],
  );

  const toggleSource = useCallback((role: AIRole) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      try {
        localStorage.setItem(SOURCES_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // Merge server provider info over the static fallback.
  const providerList = PROVIDER_IDS.map((id) => {
    const server = providers.find((p) => p.id === id);
    const meta = PROVIDER_META[id];
    return {
      id,
      label: server?.label ?? meta.label,
      keysUrl: server?.keysUrl ?? meta.keysUrl,
      note: server?.note ?? meta.note,
      hasKey: server?.hasKey ?? false,
    };
  });

  return (
    <div className={styles.page}>
      {offline ? (
        <div className={styles.banner}>
          Backend not reachable — start it with{" "}
          <code>bun --filter @autonoe/server dev</code>. Keys and role models
          won&apos;t persist until then.
        </div>
      ) : null}

      {/* Providers */}
      <section className={styles.section}>
        <div className={styles.sechead}>
          <h2>Provider keys</h2>
          <span className={styles.hint}>
            Stored encrypted on the server. Free tiers — no card required.
          </span>
        </div>
        <div className={styles.provs}>
          {providerList.map((p) => (
            <div className={styles.prov} key={p.id}>
              <div className={styles.provtop}>
                <span className={styles.provname}>{p.label}</span>
                <span
                  className={`${styles.badge} ${p.hasKey ? styles.badgeOk : ""}`}
                >
                  {p.hasKey ? "key set" : "no key"}
                </span>
              </div>
              <p className={styles.note}>{p.note}</p>
              <div className={styles.keyrow}>
                <input
                  className={styles.input}
                  type="password"
                  placeholder={p.hasKey ? "•••• replace key" : "Paste API key"}
                  value={drafts[p.id] ?? ""}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [p.id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void saveKey(p.id);
                  }}
                />
                <button
                  type="button"
                  className={styles.save}
                  disabled={saving === p.id || !(drafts[p.id] ?? "").trim()}
                  onClick={() => void saveKey(p.id)}
                >
                  {saving === p.id ? "Saving…" : "Save"}
                </button>
              </div>
              <a
                className={styles.getkey}
                href={p.keysUrl}
                target="_blank"
                rel="noreferrer"
              >
                Get a free key →
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Role → model */}
      <section className={styles.section}>
        <div className={styles.sechead}>
          <h2>Role models</h2>
          <span className={styles.hint}>
            Assign a model to each place AI runs. Save a provider key to load its
            models.
          </span>
        </div>
        <div className={styles.roles}>
          {AI_ROLES.map((role) => {
            const current = roles?.[role];
            const currentValue = current
              ? encodeChoice(current.provider, current.model)
              : "";
            return (
              <div className={styles.role} key={role}>
                <div className={styles.rolelabel}>
                  {ROLE_LABELS[role]}
                  {ROLE_SUBLABEL[role] ? <small>{ROLE_SUBLABEL[role]}</small> : null}
                </div>
                <select
                  className={styles.select}
                  value={currentValue}
                  onChange={(e) => setRole(role, e.target.value)}
                >
                  {/* Keep the current selection visible even if its provider
                      has no key loaded. */}
                  {current &&
                  !PROVIDER_IDS.some((p) =>
                    (models[p] ?? []).some((m) => m.id === current.model),
                  ) ? (
                    <option value={currentValue}>
                      {current.provider} · {current.model}
                    </option>
                  ) : null}
                  {!current ? <option value="">Select a model…</option> : null}
                  {PROVIDER_IDS.map((p) => {
                    const list = models[p] ?? [];
                    if (list.length === 0) return null;
                    return (
                      <optgroup key={p} label={PROVIDER_META[p].label}>
                        {list.map((m) => (
                          <option key={`${p}-${m.id}`} value={encodeChoice(p, m.id)}>
                            {m.label}
                            {m.free ? " · free" : ""}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>
            );
          })}
        </div>
      </section>

      {/* Data sources */}
      <section className={styles.section}>
        <div className={styles.sechead}>
          <h2>Data sources</h2>
          <span className={styles.hint}>
            Which subagents the thesis agent may call by default.
          </span>
        </div>
        <div className={styles.sources}>
          {SUBAGENT_ROLES.map((role) => {
            const on = active.has(role);
            return (
              <div className={styles.source} key={role}>
                <span>{SOURCE_LABELS[role]}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={SOURCE_LABELS[role]}
                  className={`${styles.toggle} ${on ? styles.toggleOn : ""}`}
                  onClick={() => toggleSource(role)}
                >
                  <span className={styles.knob} />
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
