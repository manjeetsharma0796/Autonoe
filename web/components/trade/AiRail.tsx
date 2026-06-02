"use client";

import { useState } from "react";
import Link from "next/link";
import { THINKING_STEPS } from "./data";

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

function ThesisPane() {
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
          defaultValue="I think WMNT runs into the Mantle upgrade. Build a 4h swing thesis against mUSD."
        />
        <div className="intentrow">
          <button type="button" className="btn btn-violet btn-block">
            Generate thesis
          </button>
        </div>

        <div className="thesis">
          <div className="th-top">
            <span className="dir long">Long</span>
            <span className="th-asset">WMNT</span>
            <span className="th-tag">Option A</span>
          </div>
          <div className="th-body">
            <div className="pills">
              <span className="pill size">
                <span className="k">size</span> 1,000 mUSD
              </span>
              <span className="pill ret">
                <span className="k">pred.</span> +6.4% – +11%
              </span>
              <span className="pill risk">
                <span className="k">risk</span> medium
              </span>
              <span className="pill">
                <span className="k">horizon</span> 4h–2d
              </span>
            </div>
            <p className="th-desc">
              Momentum on the 4H is constructive with an ascending base off 1.22.
              Catalyst clustering into the upgrade window supports a scaled entry;
              invalidate below 1.198.
            </p>
          </div>
          <div className="th-foot">
            <Link href="/studio" className="btn btn-gold btn-block">
              Refine in Judge Panel →
            </Link>
          </div>
        </div>

        <details className="think">
          <summary>
            <span className="dotg" /> Show thinking
            <span style={{ flex: 1 }} />
            <Caret />
          </summary>
          <div className="trace">
            {THINKING_STEPS.map((s) => (
              <div className="tstep" key={s.head}>
                <b>{s.head}</b>
                {s.rest}
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}

function AssistantPane() {
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
          <div className="msg bot">
            <div className="av">A</div>
            <div className="bubble">
              Hey — I can read the live <b>mUSD/WMNT</b> book, your agent wallet,
              and the DecisionLog. What are you weighing?
            </div>
          </div>
          <div className="msg me">
            <div className="av">YOU</div>
            <div className="bubble">
              What&apos;s WMNT done in the last 24h and is now a decent entry?
            </div>
          </div>
          <div className="msg bot">
            <div className="av">A</div>
            <div className="bubble">
              WMNT is <span className="mono">+4.21%</span> at{" "}
              <span className="mono">1.2843</span>, high 1.3018 / low 1.2210.
              It&apos;s mid-range after a clean bounce off support. A scaled entry
              beats a full clip here — want me to draft a 4H thesis and route it to
              the tribunal?
            </div>
          </div>
          <div className="msg me">
            <div className="av">YOU</div>
            <div className="bubble">Yes, keep size to about 1k mUSD.</div>
          </div>
          <div className="msg bot">
            <div className="av">A</div>
            <div className="bubble">
              Done — drafted <b>Long WMNT · 1,000 mUSD</b>, predicted{" "}
              <span className="mono">+6.4%–11%</span>, risk medium. It&apos;s
              loaded in the Quick Thesis tab; hit <b>Refine in Judge Panel</b> to
              put it on trial.
            </div>
          </div>
        </div>
        <div className="composer">
          <textarea
            rows={1}
            placeholder="Message the assistant…"
            aria-label="Message the assistant"
          />
          <button type="button" className="send" aria-label="Send">
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
