import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import morgan from "morgan";
import helmet from "helmet";
import apiRoutes from "./routes/index.js";
import { errorHandler } from "./middleware/error.middleware.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dashboardDir = path.join(__dirname, "..", "public", "dashboard");

const app = express();

app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

app.use("/dashboard", express.static(dashboardDir));

app.get("/", (_req, res) => {
  res.json({
    name: "GameAndAchievementAPI",
    version: "1.0.0",
    docs: "/api/v1",
    dashboard: "/dashboard",
  });
});

app.use("/api/v1", apiRoutes);
app.use(errorHandler);

export default app;
