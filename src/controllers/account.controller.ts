import type { Response, NextFunction } from "express";
import type { AccountPlatform } from "../interfaces/db.interface.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import * as linkedAccountService from "../services/linked-account.service.js";
import { getPlatformAdapter } from "../services/platforms/index.js";
import {
  accountPlatformSchema,
  linkAccountSchema,
} from "../validators/account.validator.js";
import * as linkedAccountRepo from "../repositories/linked-account.repository.js";

export async function listAccounts(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const accounts = await linkedAccountService.listLinkedAccountsPublic(
      req.userId!,
    );
    res.json({ accounts });
  } catch (err) {
    next(err);
  }
}

export async function linkAccount(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const platform = accountPlatformSchema.parse(req.params.platform);
    const body = linkAccountSchema.parse(req.body);
    const adapter = getPlatformAdapter(platform as AccountPlatform);
    await adapter.linkAccount({
      userId: req.userId!,
      externalUserId:
        body.externalUserId ?? body.externalUsername ?? platform,
      externalUsername: body.externalUsername,
      credentials: body.credentials,
    });
    res.status(201).json({ platform, linked: true });
  } catch (err) {
    next(err);
  }
}

export async function unlinkAccount(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const platform = accountPlatformSchema.parse(req.params.platform);
    const removed = await linkedAccountRepo.deleteLinkedAccount(
      req.userId!,
      platform as AccountPlatform,
    );
    if (!removed) {
      res.status(404).json({ error: "Account not linked" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
