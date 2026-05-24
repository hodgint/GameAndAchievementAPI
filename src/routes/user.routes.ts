import { Router } from "express";
import * as accountController from "../controllers/account.controller.js";
import * as syncController from "../controllers/sync.controller.js";
import * as userController from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/me/games", userController.getMyGames);
router.get("/me/achievements", userController.getMyAchievements);

router.get("/me/sync/status", syncController.listSyncStatus);
router.get("/me/accounts", accountController.listAccounts);
router.post("/me/accounts/:platform/link", accountController.linkAccount);
router.delete("/me/accounts/:platform/link", accountController.unlinkAccount);

router.post("/me/sync", syncController.syncAll);
router.post("/me/sync/:platform", syncController.syncMyPlatform);

export default router;
