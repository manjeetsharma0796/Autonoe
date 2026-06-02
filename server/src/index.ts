// T-201 — server entrypoint. Boots the Express app on PORT (default 8787).
import { createApp } from './app.ts';

const port = Number(process.env.PORT ?? 8787);
createApp().listen(port, () => {
  console.log(`Autonoe server listening on http://localhost:${port}`);
});
