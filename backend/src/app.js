import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js"; // ✅ ADD THIS

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/", (req, res) => {
    res.send("API is running 🚀");
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // ✅ ADD THIS (CRITICAL FIX)
  app.use("/api/auth", authRoutes);

  // fallback
  app.use((req, res) => {
    res.status(404).json({ error: "Not Found" });
  });

  return app;
}