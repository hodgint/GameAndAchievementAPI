import type {
  GameListQuery,
  PaginatedResult,
} from "../interfaces/list-query.interface.js";
import type { UserGameWithDetails } from "../interfaces/db.interface.js";
import type { PoolConnection } from "mariadb";
import { executeMutation, executeQuery } from "./execute.js";

function gameOrderBy(
  sort: GameListQuery["sort"],
  order: GameListQuery["order"],
): string {
  const dir = order === "asc" ? "ASC" : "DESC";
  switch (sort) {
    case "name":
      return `g.name ${dir}`;
    case "playtime":
      return `ug.playtime ${dir}`;
    case "dateOwned":
      return `ug.date_owned ${dir}`;
    case "completion":
      return `CASE WHEN ug.achievement_total = 0 THEN 0
        ELSE ug.achievement_earned / ug.achievement_total END ${dir}`;
    case "lastPlayed":
    default:
      return `ug.last_played ${dir}, g.name ASC`;
  }
}

function buildGameFilters(query: GameListQuery): { sql: string; params: unknown[] } {
  const clauses: string[] = ["ug.user_id = ?"];
  const params: unknown[] = [];

  if (query.platform) {
    clauses.push("g.account_platform = ?");
    params.push(query.platform);
  }
  if (query.search) {
    clauses.push("g.name LIKE ?");
    params.push(`%${query.search}%`);
  }
  if (query.minPlaytime !== undefined) {
    clauses.push("ug.playtime >= ?");
    params.push(query.minPlaytime);
  }
  if (query.hasAchievements === true) {
    clauses.push("ug.achievement_total > 0");
  } else if (query.hasAchievements === false) {
    clauses.push("ug.achievement_total = 0");
  }
  if (query.completion === "complete") {
    clauses.push(
      "ug.achievement_total > 0 AND ug.achievement_earned >= ug.achievement_total",
    );
  } else if (query.completion === "in_progress") {
    clauses.push(
      "ug.achievement_earned > 0 AND ug.achievement_earned < ug.achievement_total",
    );
  } else if (query.completion === "none") {
    clauses.push("ug.achievement_earned = 0");
  }

  return { sql: clauses.join(" AND "), params };
}

const GAME_SELECT = `
  SELECT
    ug.*,
    g.name AS game_name,
    g.account_platform,
    g.image_url AS game_image_url,
    ug.achievement_total,
    ug.achievement_earned
  FROM user_games ug
  INNER JOIN games g ON g.id = ug.game_id
`;

export async function refreshGameProgress(
  userId: number,
  gameId: number,
  conn?: PoolConnection,
): Promise<void> {
  const sql = `
    UPDATE user_games ug SET
      achievement_total = (
        SELECT COUNT(*) FROM achievements a WHERE a.game_id = ?
      ),
      achievement_earned = (
        SELECT COUNT(*) FROM user_achievements ua
        INNER JOIN achievements a ON a.id = ua.achievement_id
        WHERE ua.user_id = ? AND a.game_id = ?
      ),
      updated_at = CURRENT_TIMESTAMP
    WHERE ug.user_id = ? AND ug.game_id = ?
  `;
  const params = [gameId, userId, gameId, userId, gameId];
  if (conn) {
    await conn.query(sql, params);
  } else {
    await executeMutation(sql, params);
  }
}

export async function findUserGame(
  userId: number,
  gameId: number,
): Promise<UserGameWithDetails | null> {
  const rows = await executeQuery<UserGameWithDetails[]>(
    `${GAME_SELECT} WHERE ug.user_id = ? AND ug.game_id = ? LIMIT 1`,
    [userId, gameId],
  );
  return rows[0] ?? null;
}

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
    await refreshGameProgress(input.userId, input.gameId, conn);
  } else {
    await executeMutation(sql, params);
    await refreshGameProgress(input.userId, input.gameId);
  }
}

export async function listUserGames(
  userId: number,
  query: GameListQuery,
): Promise<PaginatedResult<UserGameWithDetails>> {
  const { sql: filterSql, params: filterParams } = buildGameFilters(query);
  const baseParams = [userId, ...filterParams];

  const countRows = await executeQuery<{ total: number }[]>(
    `SELECT COUNT(*) AS total FROM user_games ug
     INNER JOIN games g ON g.id = ug.game_id
     WHERE ${filterSql}`,
    baseParams,
  );
  const total = Number(countRows[0]?.total ?? 0);

  const orderBy = gameOrderBy(query.sort, query.order);
  const rows = await executeQuery<UserGameWithDetails[]>(
    `${GAME_SELECT}
     WHERE ${filterSql}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...baseParams, query.limit, query.offset],
  );

  return { items: rows, total, limit: query.limit, offset: query.offset };
}

export async function countUserGames(userId: number): Promise<number> {
  const rows = await executeQuery<{ total: number }[]>(
    "SELECT COUNT(*) AS total FROM user_games WHERE user_id = ?",
    [userId],
  );
  return Number(rows[0]?.total ?? 0);
}
