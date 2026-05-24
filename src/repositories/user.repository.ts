import type { UserData } from "../interfaces/db.interface.js";
import { executeMutation, executeQuery } from "./execute.js";

export interface UserProfileStats {
  gameCount: number;
  achievementCount: number;
  linkedPlatformCount: number;
}

export async function findUserByEmail(
  email: string,
): Promise<UserData | null> {
  const rows = await executeQuery<UserData[]>(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [email],
  );
  return rows[0] ?? null;
}

export async function findUserById(id: number): Promise<UserData | null> {
  const rows = await executeQuery<UserData[]>(
    "SELECT * FROM users WHERE id = ? LIMIT 1",
    [id],
  );
  return rows[0] ?? null;
}

export async function createUser(
  email: string,
  passwordHash: string,
  displayName: string,
): Promise<number> {
  const result = await executeMutation(
    "INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)",
    [email, passwordHash, displayName],
  );
  return Number(result.insertId);
}

export async function updateUserProfile(
  userId: number,
  displayName: string,
): Promise<void> {
  await executeMutation(
    "UPDATE users SET display_name = ? WHERE id = ?",
    [displayName, userId],
  );
}

export async function updateUserPassword(
  userId: number,
  passwordHash: string,
): Promise<void> {
  await executeMutation(
    "UPDATE users SET password_hash = ? WHERE id = ?",
    [passwordHash, userId],
  );
}

export async function getUserProfileStats(
  userId: number,
): Promise<UserProfileStats> {
  const rows = await executeQuery<
    Array<{
      game_count: number;
      achievement_count: number;
      linked_platform_count: number;
    }>
  >(
    `SELECT
      (SELECT COUNT(*) FROM user_games WHERE user_id = ?) AS game_count,
      (SELECT COUNT(*) FROM user_achievements WHERE user_id = ?) AS achievement_count,
      (SELECT COUNT(*) FROM linked_accounts WHERE user_id = ?) AS linked_platform_count`,
    [userId, userId, userId],
  );
  const row = rows[0];
  return {
    gameCount: Number(row?.game_count ?? 0),
    achievementCount: Number(row?.achievement_count ?? 0),
    linkedPlatformCount: Number(row?.linked_platform_count ?? 0),
  };
}
