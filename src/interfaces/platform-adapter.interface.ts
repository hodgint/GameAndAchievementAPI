import type { AccountPlatform } from "./db.interface.js";

export interface LinkAccountInput {
  userId: number;
  externalUserId: string;
  externalUsername?: string;
  credentials: Record<string, unknown>;
}

export interface SyncSummary {
  gamesSynced: number;
  achievementsSynced: number;
  userAchievementsSynced: number;
}

export interface PlatformAdapter {
  readonly platform: AccountPlatform;
  linkAccount(input: LinkAccountInput): Promise<void>;
  sync(userId: number): Promise<SyncSummary>;
}
