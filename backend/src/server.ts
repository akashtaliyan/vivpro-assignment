/**
 * Server entrypoint (TypeScript)
 */

import { createApp } from './app';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5001;
const app = createApp();

app.listen(PORT, () => {
  console.log(`Vivpro Songs API (TypeScript) listening on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Songs endpoint: http://localhost:${PORT}/api/songs`);
});
