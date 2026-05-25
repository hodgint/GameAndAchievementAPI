import type { AccountPlatform } from "../interfaces/db.interface.js";
import type { SyncSummary } from "../interfaces/platform-adapter.interface.js";
import {
  AccountNotLinkedError,
  SyncConflictError,
} from "../errors/sync.errors.js";
import * as linkedAccountRepo from "../repositories/linked-account.repository.js";
import * as syncStateRepo from "../repositories/sync-state.repository.js";
import { getPlatformAdapter } from "./platforms/index.js";

const PLATFORMS: AccountPlatform[] = ["retro", "psn", "steam", "xbox"];

export async function assertCanSync(
  userId: number,
  platform: AccountPlatform,
): Promise<void> {
  const linked = await linkedAccountRepo.findLinkedAccount(userId, platform);
  if (!linked) {
    throw new AccountNotLinkedError(platform);
  }

  const state = await syncStateRepo.getSyncState(userId, platform);
  if (state?.status === "running") {
    throw new SyncConflictError(
      `Sync already in progress for ${platform}`,
      state,
    );
  }
}

export async function syncPlatform(
  userId: number,
  platform: AccountPlatform,
): Promise<SyncSummary> {
  await assertCanSync(userId, platform);
  const adapter = getPlatformAdapter(platform);
  return adapter.sync(userId);
}

export async function syncAllPlatforms(
  userId: number,
): Promise<Record<AccountPlatform, SyncSummary | { error: string; skipped?: boolean }>> {
  const results = {} as Record<
    AccountPlatform,
    SyncSummary | { error: string; skipped?: boolean }
  >;

  for (const platform of PLATFORMS) {
    const linked = await linkedAccountRepo.findLinkedAccount(userId, platform);
    if (!linked) {
      results[platform] = {
        error: "Account not linked",
        skipped: true,
      };
      continue;
    }

    try {
      results[platform] = await syncPlatform(userId, platform);
    } catch (err) {
      if (err instanceof SyncConflictError) {
        results[platform] = { error: err.message };
        continue;
      }
      results[platform] = {
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return results;
}

export function listSupportedPlatforms(): AccountPlatform[] {
  return [...PLATFORMS];
}
