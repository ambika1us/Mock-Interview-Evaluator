import { createApp } from "./app.js";
import connectDb from "./db/connect.js";
import seedIfEmpty from "./seed.js"; // optional but recommended

const PORT = process.env.PORT || 8080;

async function start() {
  try {
    // ✅ 1. Connect to MongoDB
    await connectDb();

    // ✅ 2. Seed admin (only if not exists)
    if (seedIfEmpty) {
      await seedIfEmpty();
    }

    // ✅ 3. Create Express app
    const app = createApp();

    // ✅ 4. Start server (Railway requires 0.0.0.0)
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
      console.log(
        `[api] LLM evaluator: ${
          process.env.USER_LLM_API_KEY
            ? "enabled"
            : "offline fallback"
        }`
      );
    });

  } catch (error) {
    console.error("❌ Server failed to start:", error);
    process.exit(1); // required for Railway to detect crash
  }
}

start();