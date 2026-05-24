import { Router } from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import * as healthController from "../controllers/health.controller.js";
import * as platformsController from "../controllers/platforms.controller.js";

const router = Router();

router.get("/health", healthController.healthCheck);
router.get("/platforms", platformsController.listPlatforms);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);

export default router;
