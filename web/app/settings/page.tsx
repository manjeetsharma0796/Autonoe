"use client";

import { useEffect, useState } from "react";
import type { ModelInfo, ProviderId, ProviderInfo } from "@autonoe/shared";
import { getProviders } from "@/lib/api";
import { ProviderCard } from "@/components/settings/ProviderCard";
import { RoleModelPanel } from "@/components/settings/RoleModelPanel";
import { DataSourcePanel } from "@/components/settings/DataSourcePanel";

type ModelsByProvider = Partial<Record<ProviderId, ModelInfo[]>>;

export default function SettingsPage() {
  const [providers, setProviders] = useState<ProviderInfo[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modelsByProvider, setModelsByProvider] = useState<ModelsByProvider>({});

  useEffect(() => {
    getProviders()
      .then((list) => setProviders(list))
      .catch((e) =>
        setLoadError(e instanceof Error ? e.message : "Unknown error")
      );
  }, []);

  function handleModelsLoaded(providerId: ProviderId, models: ModelInfo[]) {
    setModelsByProvider((prev) => ({ ...prev, [providerId]: models }));
  }

  return (
    <main className="wrap" style={{ paddingTop: 140, minHeight: "100vh", paddingBottom: 80 }}>
      {/* Page header */}
      <span className="tag">Configuration</span>
      <h1 className="h2">Settings</h1>
      <p className="sub">
        Manage provider API keys, assign models to each AI role, and configure
        which data sources are active in thesis generation.
      </p>

      {/* ── Section 1: Provider keys ─────────────────────────────────────── */}
      <section style={{ marginTop: 56 }}>
        <SectionHeader
          label="01"
          title="Provider API Keys"
          sub="Keys are stored server-side and never exposed to the browser. Each provider
          exposes a free tier — save a key to unlock its model list."
        />

        {loadError && (
          <p style={{ color: "var(--red)", fontSize: 13, marginTop: 16 }}>
            Could not load provider status: {loadError}. You can still paste
            keys below.
          </p>
        )}

        {!providers && !loadError && (
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 16 }}>
            Loading providers…
          </p>
        )}

        {providers && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 18,
              marginTop: 24,
            }}
          >
            {providers.map((p) => (
              <ProviderCard
                key={p.id}
                provider={p}
                onModelsLoaded={handleModelsLoaded}
              />
            ))}
          </div>
        )}

        {/* Fallback cards if providers failed to load */}
        {loadError && (
          <FallbackProviderCards onModelsLoaded={handleModelsLoaded} />
        )}
      </section>

      {/* Divider */}
      <div
        style={{
          margin: "52px 0",
          height: 1,
          background: "var(--line)",
        }}
      />

      {/* ── Section 2: Role → model assignment ───────────────────────────── */}
      <section>
        <SectionHeader
          label="02"
          title="Role Model Assignments"
          sub="Each AI role can use a different provider and model. Assignments are
          persisted server-side and apply to every thesis run."
        />
        <div style={{ marginTop: 24 }}>
          <RoleModelPanel modelsByProvider={modelsByProvider} />
        </div>
      </section>

      {/* Divider */}
      <div
        style={{
          margin: "52px 0",
          height: 1,
          background: "var(--line)",
        }}
      />

      {/* ── Section 3: Data sources ───────────────────────────────────────── */}
      <section>
        <SectionHeader
          label="03"
          title="Data Sources"
          sub="Toggle subagents on or off. Disabled subagents are excluded from thesis
          generation — useful for faster runs or when a provider is unavailable."
        />
        <div style={{ marginTop: 24 }}>
          <DataSourcePanel />
        </div>
      </section>
    </main>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({
  label,
  title,
  sub,
}: {
  label: string;
  title: string;
  sub: string;
}) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "var(--gold)",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--disp)",
          fontWeight: 700,
          fontSize: 22,
          color: "var(--ink)",
          marginBottom: 8,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </div>
      <p style={{ fontSize: 14, color: "var(--muted)", maxWidth: 600 }}>{sub}</p>
    </div>
  );
}

// Fallback when /api/providers is unavailable — render static cards using
// the free-key links and notes from the PRD so the user can still paste keys.
const FALLBACK_PROVIDERS: ProviderInfo[] = [
  {
    id: "groq",
    label: "Groq",
    keysUrl: "https://console.groq.com/keys",
    note: "Free tier: 6,000 req/day on Llama 3 family",
    hasKey: false,
  },
  {
    id: "mistral",
    label: "Mistral",
    keysUrl: "https://console.mistral.ai/api-keys",
    note: "Free tier: 1 req/sec on Mistral 7B",
    hasKey: false,
  },
  {
    id: "nvidia",
    label: "NVIDIA NIM",
    keysUrl: "https://build.nvidia.com",
    note: "Free tier: 1,000 credits on launch",
    hasKey: false,
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    keysUrl: "https://openrouter.ai/keys",
    note: "Aggregates 100+ models; free-tier routes available",
    hasKey: false,
  },
  {
    id: "gemini",
    label: "Gemini",
    keysUrl: "https://aistudio.google.com/apikey",
    note: "Free tier: 15 req/min on Gemini 1.5 Flash",
    hasKey: false,
  },
];

function FallbackProviderCards({
  onModelsLoaded,
}: {
  onModelsLoaded: (providerId: ProviderId, models: ModelInfo[]) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: 18,
        marginTop: 24,
      }}
    >
      {FALLBACK_PROVIDERS.map((p) => (
        <ProviderCard key={p.id} provider={p} onModelsLoaded={onModelsLoaded} />
      ))}
    </div>
  );
}
