import type { UserGameWithDetails } from "../interfaces/db.interface.js";
import type { PoolConnection } from "mariadb";
import { executeMutation, executeQuery } from "./execute.js";

export async function upsertUserGame(
  input: {
    userId: number;
    gameId: number;
    dateOwned?: Date | null;
    playtime?: number;
    lastPlayed?: Date | null;
  },
  conn?: PoolConnection,
): Promise<void> {
  const sql = `
    INSERT INTO user_games (user_id, game_id, date_owned, playtime, last_played)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      date_owned = COALESCE(VALUES(date_owned), date_owned),
      playtime = GREATEST(playtime, VALUES(playtime)),
      last_played = COALESCE(VALUES(last_played), last_played),
      updated_at = CURRENT_TIMESTAMP
  `;
  const params = [
    input.userId,
    input.gameId,
    input.dateOwned ?? null,
    input.playtime ?? 0,
    input.lastPlayed ?? null,
  ];
  if (conn) {
    await conn.query(sql, params);
  } else {
    await executeMutation(sql, params);
  }
}

export async function listUserGames(
  userId: number,
  platform?: string,
): Promise<UserGameWithDetails[]> {
  let sql = `
    SELECT
      ug.*,
      g.name AS game_name,
      g.account_platform,
      g.image_url AS game_image_url,
      (SELECT COUNT(*) FROM achievements a WHERE a.game_id = g.id) AS achievement_total,
      (SELECT COUNT(*) FROM user_achievements ua
        INNER JOIN achievements a ON a.id = ua.achievement_id
        WHERE ua.user_id = ug.user_id AND a.game_id = g.id) AS achievement_earned
    FROM user_games ug
    INNER JOIN games g ON g.id = ug.game_id
    WHERE ug.user_id = ?
  `;
  const params: unknown[] = [userId];
  if (platform) {
    sql += " AND g.account_platform = ?";
    params.push(platform);
  }
  sql += " ORDER BY ug.last_played DESC, g.name ASC";
  return executeQuery<UserGameWithDetails[]>(sql, params);
}
