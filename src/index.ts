import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import helmet from "helmet";
import { loadEnv } from "./config/env.js";
import apiRoutes from "./routes/index.js";
import { errorHandler } from "./middleware/error.middleware.js";

dotenv.config();
loadEnv();

const env = loadEnv();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dashboardDir = path.join(__dirname, "..", "public", "dashboard");

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
);

if (env.CORS_ORIGIN) {
  const origins = env.CORS_ORIGIN.split(",").map((o) => o.trim());
  app.use(cors({ origin: origins, credentials: true }));
}

app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));

app.use("/dashboard", express.static(dashboardDir));

app.get("/", (_req, res) => {
  res.json({
    name: "GameAndAchievementAPI",
    version: "1.0.0",
    docs: "/api/v1",
    dashboard: "/dashboard",
    health: "/api/v1/health",
  });
});

app.use("/api/v1", apiRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(errorHandler);

export default app;
