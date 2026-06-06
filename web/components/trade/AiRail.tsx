"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { ChatMessage, Thesis, ThesisOption } from "@autonoe/shared";
import { streamSSE } from "@/lib/stream";
import { LiveThinking } from "@/components/ai/LiveThinking";

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
  const [thinking, setThinking] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function handleGenerate() {
    // Cancel any in-flight stream
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);
    setThesis(null);
    setThinking("");

    try {
      await streamSSE(
        "/api/thesis/stream",
        {
          intent,
          activeSources: [
            "subagent.onchain",
            "subagent.market",
            "subagent.indicators",
          ],
        },
        {
          signal: ctrl.signal,
          onEvent(event, data) {
            if (event === "thinking") {
              const d = data as { delta?: string };
              if (d.delta) setThinking((prev) => prev + d.delta);
            } else if (event === "result") {
              setThesis(data as Thesis);
            } else if (event === "error") {
              const d = data as { error?: string };
              setError(d.error ?? "Unknown error");
            }
            // "token" and "done" are not produced by /thesis/stream — ignore
          },
        }
      );
    } catch (e) {
      if ((e as { name?: string }).name !== "AbortError") {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
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
            onClick={() => void handleGenerate()}
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

        {/* Live thinking panel — visible while streaming and after */}
        <LiveThinking text={thinking} streaming={loading} />

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
  // Streaming in-progress bubble text (null = not streaming)
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const streamedRef = useRef<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  function scrollToBottom() {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  async function handleSend() {
    const text = draft.trim();
    if (!text || loading) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const userMsg: ChatMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setDraft("");
    setLoading(true);
    setError(null);
    setStreamingContent("");
    streamedRef.current = "";
    scrollToBottom();

    try {
      let finalMessage: ChatMessage | null = null;

      await streamSSE(
        "/api/assistant/stream",
        { messages: nextMessages },
        {
          signal: ctrl.signal,
          onEvent(event, data) {
            if (event === "token") {
              const d = data as { delta?: string };
              if (d.delta) {
                streamedRef.current += d.delta;
                setStreamingContent(streamedRef.current);
                scrollToBottom();
              }
            } else if (event === "result") {
              finalMessage = data as ChatMessage;
            } else if (event === "error") {
              const d = data as { error?: string };
              setError(d.error ?? "Unknown error");
            }
          },
        }
      );

      // Commit the final message, falling back to accumulated streamed tokens
      setStreamingContent(null);
      const committed: ChatMessage | null =
        finalMessage ??
        (streamedRef.current
          ? { role: "assistant", content: streamedRef.current }
          : null);
      if (committed) {
        setMessages((prev) => [...prev, committed]);
      }
    } catch (e) {
      if ((e as { name?: string }).name !== "AbortError") {
        setError(e instanceof Error ? e.message : "Unknown error");
        setStreamingContent(null);
      }
    } finally {
      setLoading(false);
      scrollToBottom();
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
          {/* In-progress streaming bubble */}
          {loading && (
            <div className="msg bot">
              <div className="av">A</div>
              <div className="bubble">
                {streamingContent ? (
                  <>
                    {streamingContent}
                    <span style={{ opacity: 0.5 }}>▋</span>
                  </>
                ) : (
                  <span style={{ opacity: 0.6 }}>Thinking…</span>
                )}
              </div>
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
