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
  const PORT = process.env.PORT || env.port || 3001;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[api] listening on http://0.0.0.0:${PORT}`);
    console.log(`[api] LLM evaluator: ${env.llm.apiKey ? 'enabled' : 'offline fallback (set USER_LLM_API_KEY to enable)'}`);
  });
}
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});
main().catch((err) => {
  console.error('[fatal] failed to start server:', err);
  process.exit(1);
});
