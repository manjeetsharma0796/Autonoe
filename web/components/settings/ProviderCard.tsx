"use client";

import { useState } from "react";
import type { ProviderInfo, ModelInfo } from "@autonoe/shared";
import type { ProviderId } from "@autonoe/shared";
import { postKey, getModels } from "@/lib/api";

interface Props {
  provider: ProviderInfo;
  onModelsLoaded: (providerId: ProviderId, models: ModelInfo[]) => void;
}

type Status = "idle" | "saving" | "ok" | "error";

export function ProviderCard({ provider, onModelsLoaded }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSave() {
    const trimmed = apiKey.trim();
    if (!trimmed) return;
    setStatus("saving");
    setErrorMsg("");
    try {
      await postKey({ provider: provider.id, apiKey: trimmed });
      const models = await getModels(provider.id);
      onModelsLoaded(provider.id, models);
      setStatus("ok");
      setApiKey("");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Unknown error");
      setStatus("error");
    }
  }

  const hasKey = provider.hasKey;

  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: 16,
        padding: "22px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div
            style={{
              fontFamily: "var(--disp)",
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--gold2)",
            }}
          >
            {provider.label}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
            {provider.note}
          </div>
        </div>
        {hasKey && (
          <span
            style={{
              fontSize: 11,
              fontFamily: "var(--mono)",
              letterSpacing: "0.12em",
              color: "var(--green)",
              background: "rgba(63,224,166,0.1)",
              border: "1px solid rgba(63,224,166,0.2)",
              borderRadius: 999,
              padding: "3px 10px",
              whiteSpace: "nowrap",
            }}
          >
            KEY SAVED
          </span>
        )}
      </div>

      {/* Input + save */}
      <div style={{ display: "flex", gap: 10 }}>
        <input
          type="password"
          placeholder={hasKey ? "Paste new key to replace…" : "Paste API key…"}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          style={{
            flex: 1,
            background: "var(--bg2)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            padding: "10px 14px",
            color: "var(--ink)",
            fontFamily: "var(--mono)",
            fontSize: 13,
            outline: "none",
          }}
        />
        <button
          className="btn btn-gold"
          type="button"
          disabled={status === "saving" || !apiKey.trim()}
          onClick={handleSave}
          style={{ minWidth: 68, opacity: !apiKey.trim() ? 0.5 : 1 }}
        >
          {status === "saving" ? "…" : "Save"}
        </button>
      </div>

      {/* Status feedback */}
      {status === "ok" && (
        <p style={{ fontSize: 12, color: "var(--green)", margin: 0 }}>
          Key saved and models loaded.
        </p>
      )}
      {status === "error" && (
        <p style={{ fontSize: 12, color: "var(--red)", margin: 0 }}>
          {errorMsg}
        </p>
      )}

      {/* Deep link */}
      <a
        href={provider.keysUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: 12,
          color: "var(--gold)",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          width: "fit-content",
        }}
      >
        Get a free key →
      </a>
    </div>
  );
}
