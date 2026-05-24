import type { Response, NextFunction } from "express";
import type { AccountPlatform } from "../interfaces/db.interface.js";
import type { AccountListQuery } from "../interfaces/list-query.interface.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import * as linkedAccountService from "../services/linked-account.service.js";
import { getPlatformAdapter } from "../services/platforms/index.js";
import {
  accountPlatformSchema,
  linkAccountSchema,
} from "../validators/account.validator.js";
import { accountListQuerySchema } from "../validators/list-query.validator.js";
import * as linkedAccountRepo from "../repositories/linked-account.repository.js";
import { parseListQuery } from "../utils/list-query.js";

function toAccountListQuery(
  parsed: ReturnType<typeof accountListQuerySchema.parse>,
): AccountListQuery {
  return {
    search: parsed.q,
    platform: parsed.platform,
    sort: parsed.sort,
    order: parsed.order,
    limit: parsed.limit,
    offset: parsed.offset,
  };
}

export async function listAccounts(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = parseListQuery(accountListQuerySchema, req);
    const query = toAccountListQuery(parsed);
    const result = await linkedAccountService.listLinkedAccountsPublic(
      req.userId!,
      query,
    );
    res.json({
      accounts: result.items,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      filters: {
        q: query.search,
        platform: query.platform,
        sort: query.sort,
        order: query.order,
      },
    });
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
