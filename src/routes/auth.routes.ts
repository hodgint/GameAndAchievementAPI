import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { authRateLimiter } from "../middleware/rate-limit.middleware.js";

const router = Router();

router.use(authRateLimiter);

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);

export default router;
