"use client";

import { BALANCES } from "./data";

export function Balances() {
  return (
    <section className="panel">
      <div className="phead">
        <span className="lab">Agent wallet · balances</span>
      </div>
      <div className="pbody">
        <div className="balstrip">
          {BALANCES.map((b) => (
            <div className="c" key={b.sym}>
              <div className="sy">
                <span className="b">{b.badge}</span> {b.sym}
              </div>
              <div className="n">{b.n}</div>
              <div className={`subv ${b.tone ?? ""}`}>{b.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
