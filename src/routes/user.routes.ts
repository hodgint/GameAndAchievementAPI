import { Router } from "express";
import * as accountController from "../controllers/account.controller.js";
import * as syncController from "../controllers/sync.controller.js";
import * as userController from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { privateCache } from "../middleware/cache.middleware.js";
import { syncRateLimiter } from "../middleware/rate-limit.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/me", privateCache(30), userController.getMe);
router.patch("/me", userController.updateMe);

router.get("/me/games", privateCache(30), userController.getMyGames);
router.get("/me/games/:gameId", privateCache(30), userController.getMyGame);
router.get(
  "/me/games/:gameId/achievements",
  privateCache(30),
  userController.getMyGameAchievements,
);
router.get("/me/achievements", privateCache(30), userController.getMyAchievements);

router.get("/me/sync/status", privateCache(15), syncController.listSyncStatus);
router.get("/me/sync/jobs/:jobId", syncController.getSyncJobStatus);
router.get("/me/accounts", privateCache(30), accountController.listAccounts);
router.post("/me/accounts/:platform/link", accountController.linkAccount);
router.delete("/me/accounts/:platform/link", accountController.unlinkAccount);

router.post("/me/sync", syncRateLimiter, syncController.syncAll);
router.post("/me/sync/:platform", syncRateLimiter, syncController.syncMyPlatform);

export default router;
