import { createApp } from "./app.js";
import connectDb from "./db/connect.js";

const PORT = process.env.PORT || 8080;

async function start() {
  try {
    await connectDb();

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