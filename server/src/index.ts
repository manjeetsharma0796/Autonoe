// T-201 - server entrypoint. Boots the Express app on PORT (default 8787).
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createApp } from './app.ts';
import { seedEnvProviderKeys } from './store.ts';

// Bun only auto-loads .env from the launch cwd (server/). The oracle signer key
// (DEPLOYER_PRIVATE_KEY / ORACLE_SIGNER_PRIVATE_KEY) and provider keys live in the
// repo-root .env.local, so without this they are missing and synthetic trades fail
// with "oracle signer key not configured" (price-sign 503). Load the root env file
// here, cwd-independently, filling in only vars not already set.
function loadRootEnv(): void {
  const here = dirname(fileURLToPath(import.meta.url)); // server/src
  for (const rel of ['../../.env.local', '../../.env', '../.env.local', '../.env']) {
    const path = resolve(here, rel);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m || !m[1]) continue;
      const key = m[1];
      const val = (m[2] ?? '').trim().replace(/^["']|["']$/g, '');
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}
loadRootEnv();

// Make pre-set provider keys (.env/.env.local) usable without visiting Settings.
seedEnvProviderKeys();

const port = Number(process.env.PORT ?? 8787);
createApp().listen(port, () => {
  console.log(`Autonoe server listening on http://localhost:${port}`);
});
