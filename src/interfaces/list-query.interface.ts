import type { AccountPlatform } from "./db.interface.js";

export type SortOrder = "asc" | "desc";

export type GameCompletionFilter = "all" | "complete" | "in_progress" | "none";

export type GameSortField =
  | "name"
  | "lastPlayed"
  | "playtime"
  | "completion"
  | "dateOwned";

export type AchievementSortField =
  | "dateEarned"
  | "name"
  | "points"
  | "gameName";

export type AccountSortField = "platform" | "username" | "linkedAt";

export type SyncSortField = "platform" | "lastSyncAt" | "status";

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface GameListQuery extends PaginationParams {
  search?: string;
  platform?: AccountPlatform;
  completion?: GameCompletionFilter;
  sort: GameSortField;
  order: SortOrder;
  minPlaytime?: number;
  hasAchievements?: boolean;
}

export interface AchievementListQuery extends PaginationParams {
  search?: string;
  platform?: AccountPlatform;
  gameId?: number;
  from?: Date;
  to?: Date;
  minPoints?: number;
  sort: AchievementSortField;
  order: SortOrder;
}

export interface AccountListQuery extends PaginationParams {
  search?: string;
  platform?: AccountPlatform;
  sort: AccountSortField;
  order: SortOrder;
}

export interface SyncListQuery extends PaginationParams {
  platform?: AccountPlatform;
  status?: "idle" | "running" | "success" | "error";
  sort: SyncSortField;
  order: SortOrder;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
