import { createApp } from "./app.js";
import connectDb from "./db/connect.js";
import { seedIfEmpty } from "./seed.js";   // ✅ ADD

const PORT = process.env.PORT || 8080;

async function start() {
  try {
    await connectDb();
    console.log(">>> SEED FIX v1 IS LIVE <<<");
    await seedIfEmpty();                    // ✅ ADD — creates admin if missing
    const app = createApp();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Startup error:", err);
    process.exit(1);
  }
}

start();