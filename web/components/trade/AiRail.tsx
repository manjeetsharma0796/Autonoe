"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { ChatMessage, ReasoningTrace, Thesis, ThesisOption } from "@autonoe/shared";
import { postThesis, postAssistant } from "@/lib/api";
import { ThinkingTrace } from "@/components/studio/ThinkingTrace";

// ── inline icons ─────────────────────────────────────────────────────────────

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
    <svg
      className="car"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
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

// ── helpers ───────────────────────────────────────────────────────────────────

function dirLabel(d: ThesisOption["direction"]): string {
  return d.charAt(0).toUpperCase() + d.slice(1);
}

function retRange(lo: number, hi: number): string {
  const f = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
  return `${f(lo)} – ${f(hi)}`;
}

// ── ThesisPane ────────────────────────────────────────────────────────────────

function ThesisPane() {
  const [intent, setIntent] = useState(
    "I think WMNT runs into the Mantle upgrade. Build a 4h swing thesis against mUSD."
  );
  const [thesis, setThesis] = useState<Thesis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setThesis(null);
    try {
      const result = await postThesis({
        intent,
        // default: all subagents enabled in the trade quick-thesis rail
        activeSources: [
          "subagent.onchain",
          "subagent.market",
          "subagent.indicators",
        ],
      });
      setThesis(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  // Pick the first (best) option for the compact card
  const topOption = thesis?.options[0] ?? null;

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
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? "Generating…" : "Generate thesis"}
          </button>
        </div>

        {error && (
          <div style={{ color: "var(--red, #FF6B6B)", fontSize: 13, marginTop: 10 }}>
            {error}
          </div>
        )}

        {topOption && thesis && (
          <>
            <div className="thesis">
              <div className="th-top">
                <span className={`dir ${topOption.direction}`}>{dirLabel(topOption.direction)}</span>
                <span className="th-asset">{topOption.asset}</span>
                <span className="th-tag">{topOption.id}</span>
              </div>
              <div className="th-body">
                <div className="pills">
                  <span className="pill size">
                    <span className="k">size</span>{" "}
                    {topOption.sizeMUSD.toLocaleString()} mUSD
                  </span>
                  <span className="pill ret">
                    <span className="k">pred.</span>{" "}
                    {retRange(
                      topOption.predictedReturnPct.low,
                      topOption.predictedReturnPct.high
                    )}
                  </span>
                  <span className="pill risk">
                    <span className="k">risk</span> {topOption.risk}
                  </span>
                </div>
                <p className="th-desc">{topOption.rationale}</p>
              </div>
              <div className="th-foot">
                <Link href="/studio" className="btn btn-gold btn-block">
                  Refine in Judge Panel →
                </Link>
              </div>
            </div>

            {/* Reasoning traces — use the shared ThinkingTrace */}
            {thesis.traces && thesis.traces.length > 0 ? (
              <details className="think">
                <summary>
                  <span className="dotg" /> Show thinking
                  <span style={{ flex: 1 }} />
                  <Caret />
                </summary>
                <div className="trace">
                  {thesis.traces.map((t: ReasoningTrace, i: number) => (
                    <div className="tstep" key={i}>
                      <b>{t.role}</b>
                      {" — "}{t.summary}
                    </div>
                  ))}
                </div>
              </details>
            ) : thesis.reasoning ? (
              <details className="think">
                <summary>
                  <span className="dotg" /> Show thinking
                  <span style={{ flex: 1 }} />
                  <Caret />
                </summary>
                <div className="trace">
                  <div className="tstep">
                    <b>reasoning</b>
                    {" — "}{thesis.reasoning}
                  </div>
                </div>
              </details>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

// ── AssistantPane ─────────────────────────────────────────────────────────────

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "Hey — I can read the live mUSD/WMNT book, your agent wallet, and the DecisionLog. What are you weighing?",
  },
];

function AssistantPane() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function handleSend() {
    const text = draft.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setDraft("");
    setLoading(true);
    setError(null);

    try {
      const reply = await postAssistant({ messages: nextMessages });
      setMessages((prev) => [...prev, reply]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
      // Scroll to bottom
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

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
            <div key={i} className={`msg ${m.role === "assistant" ? "bot" : "me"}`}>
              <div className="av">{m.role === "assistant" ? "A" : "YOU"}</div>
              <div className="bubble">{m.content}</div>
            </div>
          ))}
          {loading && (
            <div className="msg bot">
              <div className="av">A</div>
              <div className="bubble" style={{ opacity: 0.6 }}>Thinking…</div>
            </div>
          )}
          {error && (
            <div className="msg bot">
              <div className="av">A</div>
              <div className="bubble" style={{ color: "var(--red, #FF6B6B)" }}>
                {error}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="composer">
          <textarea
            rows={1}
            placeholder="Message the assistant…"
            aria-label="Message the assistant"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
          />
          <button
            type="button"
            className="send"
            aria-label="Send"
            onClick={() => void handleSend()}
            disabled={loading || !draft.trim()}
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AiRail ────────────────────────────────────────────────────────────────────

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
