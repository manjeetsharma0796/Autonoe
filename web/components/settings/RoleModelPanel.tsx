"use client";

import { useState, useEffect } from "react";
import type { AIRole, ProviderId, RoleModelMap, ModelInfo } from "@autonoe/shared";
import { AI_ROLES } from "@autonoe/shared";
import { getRoles, putRoles } from "@/lib/api";

type ModelsByProvider = Partial<Record<ProviderId, ModelInfo[]>>;

interface Props {
  modelsByProvider: ModelsByProvider;
}

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

type SaveStatus = "idle" | "saving" | "ok" | "error";

// Utility: collect all unique providers that have loaded models
function activeProviders(modelsByProvider: ModelsByProvider): ProviderId[] {
  return Object.entries(modelsByProvider)
    .filter(([, models]) => models && models.length > 0)
    .map(([p]) => p as ProviderId);
}

export function RoleModelPanel({ modelsByProvider }: Props) {
  const [roleMap, setRoleMap] = useState<Partial<RoleModelMap>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    getRoles()
      .then((map) => setRoleMap(map as Partial<RoleModelMap>))
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Unknown error"))
      .finally(() => setLoading(false));
  }, []);

  const providers = activeProviders(modelsByProvider);

  function handleProviderChange(role: AIRole, providerId: string) {
    setRoleMap((prev) => ({
      ...prev,
      [role]: { provider: providerId as ProviderId, model: "" },
    }));
  }

  function handleModelChange(role: AIRole, model: string) {
    setRoleMap((prev) => {
      const existing = prev[role];
      if (!existing) return prev;
      return { ...prev, [role]: { ...existing, model } };
    });
  }

  async function handleSave() {
    setSaveStatus("saving");
    setSaveError("");
    // Validate every role has provider+model set
    const complete: RoleModelMap = {} as RoleModelMap;
    for (const role of AI_ROLES) {
      const entry = roleMap[role];
      if (!entry || !entry.provider || !entry.model) {
        setSaveStatus("error");
        setSaveError(`Role "${ROLE_LABELS[role]}" is missing a model selection.`);
        return;
      }
      complete[role] = entry;
    }
    try {
      await putRoles(complete);
      setSaveStatus("ok");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Unknown error");
      setSaveStatus("error");
    }
  }

  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: 16,
        padding: "24px 26px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--disp)",
          fontWeight: 700,
          fontSize: 16,
          color: "var(--ink)",
          marginBottom: 6,
          letterSpacing: "0.04em",
        }}
      >
        Role → Model Assignment
      </div>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
        Assign a provider and model to each AI role. Save a provider key above
        to populate its model list.
      </p>

      {loading && (
        <p style={{ color: "var(--muted)", fontSize: 13 }}>Loading current assignments…</p>
      )}
      {loadError && (
        <p style={{ color: "var(--red)", fontSize: 13 }}>
          Could not load roles: {loadError}
        </p>
      )}

      {!loading && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 14,
              marginBottom: 22,
            }}
          >
            {AI_ROLES.map((role) => {
              const entry = roleMap[role];
              const selectedProvider = entry?.provider ?? "";
              const selectedModel = entry?.model ?? "";
              const availableModels =
                selectedProvider
                  ? (modelsByProvider[selectedProvider as ProviderId] ?? [])
                  : [];

              return (
                <div
                  key={role}
                  style={{
                    background: "var(--bg2)",
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    padding: "14px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontFamily: "var(--mono)",
                      letterSpacing: "0.1em",
                      color: "var(--gold2)",
                      textTransform: "uppercase",
                    }}
                  >
                    {ROLE_LABELS[role]}
                  </div>

                  {/* Provider selector */}
                  <select
                    value={selectedProvider}
                    onChange={(e) => handleProviderChange(role, e.target.value)}
                    style={selectStyle}
                  >
                    <option value="">— Provider —</option>
                    {providers.map((p) => (
                      <option key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </option>
                    ))}
                  </select>

                  {/* Model selector */}
                  <select
                    value={selectedModel}
                    onChange={(e) => handleModelChange(role, e.target.value)}
                    disabled={!selectedProvider || availableModels.length === 0}
                    style={{
                      ...selectStyle,
                      opacity: !selectedProvider || availableModels.length === 0 ? 0.45 : 1,
                    }}
                  >
                    <option value="">
                      {!selectedProvider
                        ? "Pick a provider first"
                        : availableModels.length === 0
                        ? "Save a key to load models"
                        : "— Pick a model —"}
                    </option>
                    {availableModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label || m.id}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              className="btn btn-gold"
              type="button"
              onClick={handleSave}
              disabled={saveStatus === "saving"}
            >
              {saveStatus === "saving" ? "Saving…" : "Save Role Assignments"}
            </button>
            {saveStatus === "ok" && (
              <span style={{ fontSize: 13, color: "var(--green)" }}>Saved.</span>
            )}
            {saveStatus === "error" && (
              <span style={{ fontSize: 13, color: "var(--red)" }}>{saveError}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--line)",
  borderRadius: 8,
  padding: "8px 12px",
  color: "var(--ink)",
  fontFamily: "var(--body)",
  fontSize: 13,
  width: "100%",
  cursor: "pointer",
  outline: "none",
};
