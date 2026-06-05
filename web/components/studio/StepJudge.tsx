import { useEffect, useRef } from "react";
import styles from "./studio.module.css";
import { ThinkingTrace } from "./ThinkingTrace";
import { TribunalFlow } from "./TribunalFlow";
import { ShareButton } from "../share/ShareCard";
import { ArrowRightIcon, WarnIcon } from "./icons";
import { JUDGES, REFINED_OPTIONS, type RefinedOption } from "./data";

function RefinedCard({ opt, animate }: { opt: RefinedOption; animate: boolean }) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const pct = `${(opt.confidence * 100).toFixed(0)}%`;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (!animate || reduce) {
      bar.style.transition = "none";
      bar.style.width = pct;
      return;
    }
    // start collapsed, then expand on next frame for the CSS transition
    bar.style.width = "0%";
    const raf = requestAnimationFrame(() => {
      bar.style.width = pct;
    });
    return () => cancelAnimationFrame(raf);
  }, [animate, opt.confidence]);

  return (
    <article className={styles.ref}>
      <div className={styles.rtop}>
        <div className={styles.rasset}>
          {opt.title}
          <small>{opt.sub}</small>
        </div>
        <span className={`${styles.riskpill} ${styles[opt.risk]}`}>
          {opt.riskLabel}
        </span>
      </div>
      <div className={styles.pct}>
        <span className={styles.pv}>{opt.predicted}</span>
        <span className={styles.pl}>predicted outcome</span>
      </div>
      <div className={styles.caveats}>
        <div className={styles.cl}>Caveats</div>
        <ul>
          {opt.caveats.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>
      <div className={styles.conf}>
        <div className={styles.ch}>
          <span className={styles.ck}>Confidence</span>
          <span className={styles.cv}>{opt.confidence.toFixed(2)}</span>
        </div>
        <div className={styles.track}>
          <div className={styles.bar} ref={barRef} />
        </div>
      </div>
      <button className="btn btn-gold" type="button">
        <ArrowRightIcon />
        Execute
      </button>
    </article>
  );
}

/** `active` flips true when the user lands on Step 2 — drives the
 *  confidence-bar fill animation. */
export function StepJudge({ active }: { active: boolean }) {
  return (
    <section className="wrap" id="step-2">
      <div className="reveal">
        <span className="tag">Step two · the tribunal</span>
        <h2 className="h2" style={{ fontSize: "clamp(26px,3.6vw,40px)" }}>
          Your thesis goes on trial.
        </h2>
        <p className="sub">
          Supporter, Discriminator and Judge argue the case, then the Judge
          issues refined options with predicted outcome, risk, caveats and a
          confidence score. Each argument keeps its own reasoning trace.
        </p>
      </div>

      <TribunalFlow className="reveal" />

      <div className={styles.tri}>
        {JUDGES.map((j) => (
          <div className={`${styles.agent} ${styles[j.key]} reveal`} key={j.key}>
            <div className={styles.ic}>
              <i />
            </div>
            <div className={styles.role}>{j.role}</div>
            <h4>{j.heading}</h4>
            <p className={styles.arg}>{j.argument}</p>
            <ThinkingTrace summary={j.summary} steps={j.trace} />
          </div>
        ))}
      </div>

      <div className={`${styles.verdict} reveal`}>
        <div>
          <div className={styles.vk}>Verdict · preferred option</div>
          <h4>Long WMNT — scaled, reclaim-gated</h4>
        </div>
        <div className={styles.spacer} />
        <span className={`${styles.pill} ${styles.pillRet}`}>predicted +7.5%</span>
        <span className={`${styles.pill} ${styles.pillRisk}`}>risk: medium</span>
        <span className={`${styles.pill} ${styles.pillRisk}`}>confidence 0.62</span>
        <ShareButton
          data={{
            kind: "verdict",
            title: "Long WMNT — scaled, reclaim-gated",
            subtitle: "Judge Panel verdict · preferred option · mUSD/WMNT",
            stats: [
              { label: "predicted", value: "+7.5%" },
              { label: "risk", value: "medium" },
              { label: "confidence", value: "0.62" },
            ],
          }}
        />
      </div>

      <div className={`${styles.opthead} reveal`} style={{ marginTop: 44 }}>
        <h3>Refined options</h3>
        <span className={styles.cnt}>
          Re-scored by the panel · predicted % · risk · caveats · confidence
        </span>
      </div>
      <div className={styles.refgrid}>
        {REFINED_OPTIONS.map((opt) => (
          <div className="reveal" key={opt.id}>
            <RefinedCard opt={opt} animate={active} />
          </div>
        ))}
      </div>

      <div className={`${styles.notice} reveal`}>
        <WarnIcon />
        Testnet · not financial advice. Executing routes to /trade where your
        agent wallet signs the swap on Mantle — manual confirm.
      </div>
    </section>
  );
}
