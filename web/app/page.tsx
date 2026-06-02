export default function LandingPage() {
  return (
    <main className="wrap" style={{ paddingTop: 160, minHeight: "100vh" }}>
      <span className="eyebrow">
        <span className="ping" /> Live on Mantle Sepolia · Turing Test 2026
      </span>
      <h1
        style={{
          fontFamily: "var(--disp)",
          fontWeight: 800,
          fontSize: "clamp(48px, 9vw, 132px)",
          lineHeight: 0.98,
          margin: "26px 0 0",
        }}
      >
        Autonoe
      </h1>
      <p className="sub">Your autonomous mind for on-chain trades.</p>
    </main>
  );
}
