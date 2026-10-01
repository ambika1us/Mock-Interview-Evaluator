import express from "express";
import cors from "cors";

export function createApp() {
  const app = express();

  // ✅ basic middleware
  app.use(cors());
  app.use(express.json());

  // ✅ ROOT route (very important)
  app.get("/", (req, res) => {
    res.send("API is running 🚀");
  });

  // ✅ HEALTH route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // ✅ fallback (prevents 502)
  app.use((req, res) => {
    res.status(404).json({ error: "Not Found" });
  });

  return app; // ✅ VERY IMPORTANT
}