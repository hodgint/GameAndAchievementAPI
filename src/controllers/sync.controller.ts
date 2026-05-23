import type { Response, NextFunction } from "express";
import type { AccountPlatform } from "../interfaces/db.interface.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { syncAllPlatforms, syncPlatform } from "../services/sync.service.js";
import { accountPlatformSchema } from "../validators/account.validator.js";

export async function syncMyPlatform(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const platform = accountPlatformSchema.parse(
      req.params.platform,
    ) as AccountPlatform;
    const summary = await syncPlatform(req.userId!, platform);
    res.json({ platform, summary });
  } catch (err) {
    next(err);
  }
}

export async function syncAll(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const results = await syncAllPlatforms(req.userId!);
    res.json({ results });
  } catch (err) {
    next(err);
  }
}
