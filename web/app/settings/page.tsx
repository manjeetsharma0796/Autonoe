import { SettingsClient } from "../../components/settings/SettingsClient";

export default function SettingsPage() {
  return (
    <main className="wrap" style={{ paddingTop: 140, minHeight: "100vh" }}>
      <span className="tag">Settings</span>
      <h1 className="h2">Settings</h1>
      <p className="sub">
        Provider keys, per-role model selection and data-source toggles. Keys are
        stored encrypted on the server; free tiers only — no card required.
      </p>
      <SettingsClient />
    </main>
  );
}
