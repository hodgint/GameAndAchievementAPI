import type { UserAchievementWithDetails } from "../interfaces/db.interface.js";
import type { PoolConnection } from "mariadb";
import { executeMutation, executeQuery } from "./execute.js";

export async function upsertUserAchievement(
  input: {
    userId: number;
    achievementId: number;
    dateEarned: Date;
    progress?: number | null;
  },
  conn?: PoolConnection,
): Promise<void> {
  const sql = `
    INSERT INTO user_achievements (user_id, achievement_id, date_earned, progress)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      date_earned = LEAST(date_earned, VALUES(date_earned)),
      progress = COALESCE(VALUES(progress), progress)
  `;
  const params = [
    input.userId,
    input.achievementId,
    input.dateEarned,
    input.progress ?? null,
  ];
  if (conn) {
    await conn.query(sql, params);
  } else {
    await executeMutation(sql, params);
  }
}

export async function listUserAchievements(
  userId: number,
  platform?: string,
  gameId?: number,
): Promise<UserAchievementWithDetails[]> {
  let sql = `
    SELECT
      ua.*,
      a.name AS achievement_name,
      a.description AS achievement_description,
      a.image_url AS achievement_image_url,
      a.platform,
      a.points,
      g.id AS game_id,
      g.name AS game_name
    FROM user_achievements ua
    INNER JOIN achievements a ON a.id = ua.achievement_id
    INNER JOIN games g ON g.id = a.game_id
    WHERE ua.user_id = ?
  `;
  const params: unknown[] = [userId];
  if (platform) {
    sql += " AND a.platform = ?";
    params.push(platform);
  }
  if (gameId !== undefined) {
    sql += " AND g.id = ?";
    params.push(gameId);
  }
  sql += " ORDER BY ua.date_earned DESC";
  return executeQuery<UserAchievementWithDetails[]>(sql, params);
}
