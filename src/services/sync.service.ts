import type { AccountPlatform } from "../interfaces/db.interface.js";
import type { SyncSummary } from "../interfaces/platform-adapter.interface.js";
import { getPlatformAdapter } from "./platforms/index.js";

export async function syncPlatform(
  userId: number,
  platform: AccountPlatform,
): Promise<SyncSummary> {
  const adapter = getPlatformAdapter(platform);
  return adapter.sync(userId);
}

export async function syncAllPlatforms(
  userId: number,
): Promise<Record<AccountPlatform, SyncSummary | { error: string }>> {
  const platforms: AccountPlatform[] = ["retro", "psn", "steam", "xbox"];
  const results = {} as Record<
    AccountPlatform,
    SyncSummary | { error: string }
  >;

  for (const platform of platforms) {
    try {
      results[platform] = await syncPlatform(userId, platform);
    } catch (err) {
      results[platform] = {
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return results;
}
