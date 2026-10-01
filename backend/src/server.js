import { createApp } from './app.js';
import { connectDb } from './db/connect.js';
import { env } from './config/env.js';
import { seedIfEmpty } from './seed.js';

async function main() {
  await connectDb();
  try {
    await seedIfEmpty();
  } catch (err) {
    console.warn('[seed] skipped:', err.message);
  }

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`[api] listening on http://localhost:${env.port}`);
    console.log(`[api] LLM evaluator: ${env.llm.apiKey ? 'enabled' : 'offline fallback (set USER_LLM_API_KEY to enable)'}`);
  });
}

main().catch((err) => {
  console.error('[fatal] failed to start server:', err);
  process.exit(1);
});
