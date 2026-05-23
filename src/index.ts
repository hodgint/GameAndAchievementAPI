import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import helmet from "helmet";
import apiRoutes from "./routes/index.js";
import { errorHandler } from "./middleware/error.middleware.js";

dotenv.config();

const app = express();

app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    name: "GameAndAchievementAPI",
    version: "1.0.0",
    docs: "/api/v1",
  });
});

app.use("/api/v1", apiRoutes);
app.use(errorHandler);

export default app;
