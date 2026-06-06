// T-201 — server entrypoint. Boots the Express app on PORT (default 8787).
import { createApp } from './app.ts';
import { seedEnvProviderKeys } from './store.ts';

// Make pre-set provider keys (.env/.env.local) usable without visiting Settings.
seedEnvProviderKeys();

const port = Number(process.env.PORT ?? 8787);
createApp().listen(port, () => {
  console.log(`Autonoe server listening on http://localhost:${port}`);
});
