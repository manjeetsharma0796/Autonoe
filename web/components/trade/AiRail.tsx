"use client";

import { useState } from "react";
import Link from "next/link";
import type { ChatMessage, Thesis } from "@autonoe/shared";
import { SUBAGENT_ROLES } from "@autonoe/shared";
import { ApiError, chatAssistant, generateThesis } from "@/lib/api";

function BoltIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function Caret() {
  return (
    <svg className="car" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

const signed = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

function ThesisPane() {
  const [intent, setIntent] = useState(
    "I think WMNT runs into the Mantle upgrade. Build a 4h swing thesis against mUSD.",
  );
  const [thesis, setThesis] = useState<Thesis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const top = thesis?.options[0] ?? null;

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      setThesis(await generateThesis(intent, [...SUBAGENT_ROLES]));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't generate a thesis.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div role="tabpanel">
      <div className="railhead">
        <div className="ic">
          <BoltIcon />
        </div>
        <div>
          <h4>Quick Thesis</h4>
          <p>One intent, one ranked option.</p>
        </div>
      </div>
      <div className="railbody">
        <div className="intentlab">Your intent</div>
        <textarea
          className="intent"
          rows={3}
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
        />
        <div className="intentrow">
          <button
            type="button"
            className="btn btn-violet btn-block"
            onClick={generate}
            disabled={loading || !intent.trim()}
          >
            {loading ? "Generating…" : "Generate thesis"}
          </button>
        </div>

        {error && (
          <p style={{ color: "#ff7a7a", fontSize: 13, marginTop: 12 }}>
            {error}{" "}
            <Link href="/settings" style={{ color: "var(--gold2)" }}>
              Add a key →
            </Link>
          </p>
        )}

        {top && (
          <div className="thesis">
            <div className="th-top">
              <span className={`dir ${top.direction}`}>
                {top.direction.charAt(0).toUpperCase() + top.direction.slice(1)}
              </span>
              <span className="th-asset">{top.asset}</span>
              <span className="th-tag">Option {top.id}</span>
            </div>
            <div className="th-body">
              <div className="pills">
                <span className="pill size">
                  <span className="k">size</span>{" "}
                  {top.sizeMUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })} mUSD
                </span>
                <span className="pill ret">
                  <span className="k">pred.</span> {signed(top.predictedReturnPct.low)} –{" "}
                  {signed(top.predictedReturnPct.high)}
                </span>
                <span className="pill risk">
                  <span className="k">risk</span> {top.risk}
                </span>
              </div>
              <p className="th-desc">{top.rationale}</p>
            </div>
            <div className="th-foot">
              <Link href="/studio" className="btn btn-gold btn-block">
                Refine in Judge Panel →
              </Link>
            </div>
          </div>
        )}

        {thesis?.reasoning && (
          <details className="think">
            <summary>
              <span className="dotg" /> Show thinking
              <span style={{ flex: 1 }} />
              <Caret />
            </summary>
            <div className="trace">
              {(thesis.traces?.length
                ? thesis.traces.flatMap((t) => t.steps)
                : [{ label: "synthesis", detail: thesis.reasoning }]
              ).map((s, i) => (
                <div className="tstep" key={i}>
                  <b>{s.label}</b> — {s.detail}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hey — I can read live mUSD/WMNT market data and reason about your position. What are you weighing?",
};

function AssistantPane() {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const text = draft.trim();
    if (!text || loading) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setDraft("");
    setLoading(true);
    try {
      const reply = await chatAssistant(next);
      setMessages((m) => [...m, reply]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            e instanceof ApiError
              ? `${e.message} (configure a provider key in Settings).`
              : "Something went wrong reaching the assistant.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div role="tabpanel">
      <div className="railhead">
        <div className="ic">
          <ChatIcon />
        </div>
        <div>
          <h4>Assistant</h4>
          <p>Ask about the market or your wallet.</p>
        </div>
      </div>
      <div className="railbody">
        <div className="chat">
          {messages.map((m, i) => (
            <div className={`msg ${m.role === "assistant" ? "bot" : "me"}`} key={i}>
              <div className="av">{m.role === "assistant" ? "A" : "YOU"}</div>
              <div className="bubble">{m.content}</div>
            </div>
          ))}
          {loading && (
            <div className="msg bot">
              <div className="av">A</div>
              <div className="bubble">Thinking…</div>
            </div>
          )}
        </div>
        <div className="composer">
          <textarea
            rows={1}
            placeholder="Message the assistant…"
            aria-label="Message the assistant"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <button type="button" className="send" aria-label="Send" onClick={send}>
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AiRail() {
  const [tab, setTab] = useState<"thesis" | "assistant">("thesis");

  return (
    <aside className="rail">
      <div className="panel">
        <div className="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "thesis"}
            className={`tab ${tab === "thesis" ? "on" : ""}`}
            onClick={() => setTab("thesis")}
          >
            <BoltIcon />
            Quick Thesis
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "assistant"}
            className={`tab ${tab === "assistant" ? "on" : ""}`}
            onClick={() => setTab("assistant")}
          >
            <ChatIcon />
            Assistant
          </button>
        </div>

        {tab === "thesis" ? <ThesisPane /> : <AssistantPane />}
      </div>
    </aside>
  );
}
