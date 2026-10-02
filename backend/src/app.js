import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js"; // ✅ add if admin routes exist
import categoriesRoutes from "./routes/categories.js";   // ← ADD
import interviewRoutes from "./routes/interviews.js";

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

  // Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes); // ✅ add if you have admin.js
  app.use("/api/categories", categoriesRoutes);   // ← ADD
  app.use("/api/interviews", interviewRoutes); 

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: "Not Found" });
  });

  // ✅ JSON error handler — MUST be last and MUST have 4 args
  app.use((err, req, res, next) => {
    // Malformed JSON from body-parser
    if (err instanceof SyntaxError && "body" in err) {
      return res.status(400).json({ error: "Malformed JSON in request body" });
    }

    const status = err.status || err.statusCode || 500;
    const message = err.message || "Server error";

    // Log 5xx errors for debugging (500s are real bugs, don't hide them)
    if (status >= 500) console.error("[error]", err);

    res.status(status).json({ error: message });
  });

  return app;
}