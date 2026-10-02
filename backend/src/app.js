import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js"; // ✅ ADD THIS
import User from "./models/User.js";

app.get("/create-admin", async (req, res) => {
  try {
    const existing = await User.findOne({ email: "admin@example.com" });

    if (!existing) {
      await User.create({
        email: "admin@example.com",
        password: "Admin@123"
      });
      return res.send("Admin created");
    }

    res.send("Admin exists");
  } catch (err) {
    res.status(500).send("Error");
  }
});

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