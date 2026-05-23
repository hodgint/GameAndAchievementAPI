export type AccountPlatform = "xbox" | "steam" | "retro" | "psn";

export interface PlatformData {
  id: number;
  create_time: Date;
  name: string;
  description: string | null;
}

export interface UserData {
  id: number;
  email: string;
  password_hash: string;
  display_name: string;
  created_at: Date;
}

export interface GameData {
  id: number;
  name: string;
  platform_id: number | null;
  account_platform: AccountPlatform;
  external_id: string;
  description: string | null;
  publisher: string | null;
  developer: string | null;
  release_date: Date | null;
  image_url: string | null;
  created_at: Date;
}

export interface AchievementRow {
  id: number;
  game_id: number;
  platform: AccountPlatform;
  external_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  achievement_type: string | null;
  points: number;
  sort_order: number | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

export interface LinkedAccountData {
  id: number;
  user_id: number;
  platform: AccountPlatform;
  external_user_id: string;
  external_username: string | null;
  credentials_encrypted: string;
  linked_at: Date;
  updated_at: Date;
}

export interface UserGameData {
  id: number;
  user_id: number;
  game_id: number;
  date_owned: Date | null;
  playtime: number;
  last_played: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserAchievementData {
  id: number;
  user_id: number;
  achievement_id: number;
  date_earned: Date;
  progress: number | null;
  created_at: Date;
}

export interface SyncStateData {
  id: number;
  user_id: number;
  platform: AccountPlatform;
  last_sync_at: Date | null;
  cursor_data: string | null;
  status: "idle" | "running" | "success" | "error";
  error_message: string | null;
  updated_at: Date;
}

export interface UserGameWithDetails extends UserGameData {
  game_name: string;
  account_platform: AccountPlatform;
  game_image_url: string | null;
  achievement_total: number;
  achievement_earned: number;
}

export interface UserAchievementWithDetails extends UserAchievementData {
  achievement_name: string;
  achievement_description: string | null;
  achievement_image_url: string | null;
  platform: AccountPlatform;
  points: number;
  game_id: number;
  game_name: string;
}
