import type { Response, NextFunction } from "express";
import type { AccountPlatform } from "../interfaces/db.interface.js";
import type { SyncListQuery } from "../interfaces/list-query.interface.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  assertCanSync,
  syncAllPlatforms,
  syncPlatform,
} from "../services/sync.service.js";
import {
  getSyncJob,
  startBackgroundSync,
} from "../services/sync-queue.service.js";
import { accountPlatformSchema } from "../validators/account.validator.js";
import { syncListQuerySchema } from "../validators/list-query.validator.js";
import * as syncStateRepo from "../repositories/sync-state.repository.js";
import { parseListQuery } from "../utils/list-query.js";

function toSyncListQuery(
  parsed: ReturnType<typeof syncListQuerySchema.parse>,
): SyncListQuery {
  return {
    platform: parsed.platform,
    status: parsed.status,
    sort: parsed.sort,
    order: parsed.order,
    limit: parsed.limit,
    offset: parsed.offset,
  };
}

export async function listSyncStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = parseListQuery(syncListQuerySchema, req);
    const query = toSyncListQuery(parsed);
    const result = await syncStateRepo.listSyncStates(req.userId!, query);

    res.json({
      syncStates: result.items.map((s) => ({
        platform: s.platform,
        status: s.status,
        lastSyncAt: s.last_sync_at,
        errorMessage: s.error_message,
        updatedAt: s.updated_at,
      })),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      filters: {
        platform: query.platform,
        status: query.status,
        sort: query.sort,
        order: query.order,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getSyncJobStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const job = getSyncJob(req.params.jobId);
    if (!job || job.userId !== req.userId) {
      res.status(404).json({ error: "Sync job not found" });
      return;
    }
    res.json({ job });
  } catch (err) {
    next(err);
  }
}

export async function syncMyPlatform(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const platform = accountPlatformSchema.parse(
      req.params.platform,
    ) as AccountPlatform;
    const asyncMode = req.query.async === "true" || req.query.async === "1";

    await assertCanSync(req.userId!, platform);

    if (asyncMode) {
      const job = startBackgroundSync(req.userId!, platform);
      res.status(202).json({
        message: "Sync started",
        jobId: job.id,
        platform,
        statusUrl: `/api/v1/users/me/sync/jobs/${job.id}`,
      });
      return;
    }

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
    const asyncMode = req.query.async === "true" || req.query.async === "1";

    if (asyncMode) {
      const platforms: AccountPlatform[] = ["retro", "psn", "steam", "xbox"];
      const jobs = [];
      for (const platform of platforms) {
        try {
          await assertCanSync(req.userId!, platform);
          jobs.push(startBackgroundSync(req.userId!, platform));
        } catch {
          // skip unlinked or already running
        }
      }
      res.status(202).json({
        message: "Sync jobs queued",
        jobs: jobs.map((j) => ({
          jobId: j.id,
          platform: j.platform,
          statusUrl: `/api/v1/users/me/sync/jobs/${j.id}`,
        })),
      });
      return;
    }

    const results = await syncAllPlatforms(req.userId!);
    res.json({ results });
  } catch (err) {
    next(err);
  }
}
