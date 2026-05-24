import type {
  GameListQuery,
  PaginatedResult,
} from "../interfaces/list-query.interface.js";
import type { UserGameWithDetails } from "../interfaces/db.interface.js";
import type { PoolConnection } from "mariadb";
import { executeMutation, executeQuery } from "./execute.js";

const ACHIEVEMENT_EARNED_SQL = `(SELECT COUNT(*) FROM user_achievements ua
  INNER JOIN achievements a ON a.id = ua.achievement_id
  WHERE ua.user_id = ug.user_id AND a.game_id = g.id)`;

const ACHIEVEMENT_TOTAL_SQL = `(SELECT COUNT(*) FROM achievements a WHERE a.game_id = g.id)`;

function gameOrderBy(sort: GameListQuery["sort"], order: GameListQuery["order"]): string {
  const dir = order === "asc" ? "ASC" : "DESC";
  switch (sort) {
    case "name":
      return `g.name ${dir}`;
    case "playtime":
      return `ug.playtime ${dir}`;
    case "dateOwned":
      return `ug.date_owned ${dir}`;
    case "completion":
      return `CASE WHEN ${ACHIEVEMENT_TOTAL_SQL} = 0 THEN 0
        ELSE ${ACHIEVEMENT_EARNED_SQL} / ${ACHIEVEMENT_TOTAL_SQL} END ${dir}`;
    case "lastPlayed":
    default:
      return `ug.last_played ${dir}, g.name ASC`;
  }
}

function buildGameFilters(query: GameListQuery): { sql: string; params: unknown[] } {
  const clauses: string[] = ["ug.user_id = ?"];
  const params: unknown[] = [];

  // userId is always first param — set by caller
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
    clauses.push(`${ACHIEVEMENT_TOTAL_SQL} > 0`);
  } else if (query.hasAchievements === false) {
    clauses.push(`${ACHIEVEMENT_TOTAL_SQL} = 0`);
  }
  if (query.completion === "complete") {
    clauses.push(
      `${ACHIEVEMENT_TOTAL_SQL} > 0 AND ${ACHIEVEMENT_EARNED_SQL} >= ${ACHIEVEMENT_TOTAL_SQL}`,
    );
  } else if (query.completion === "in_progress") {
    clauses.push(
      `${ACHIEVEMENT_EARNED_SQL} > 0 AND ${ACHIEVEMENT_EARNED_SQL} < ${ACHIEVEMENT_TOTAL_SQL}`,
    );
  } else if (query.completion === "none") {
    clauses.push(`${ACHIEVEMENT_EARNED_SQL} = 0`);
  }

  return { sql: clauses.join(" AND "), params };
}

const GAME_SELECT = `
  SELECT
    ug.*,
    g.name AS game_name,
    g.account_platform,
    g.image_url AS game_image_url,
    ${ACHIEVEMENT_TOTAL_SQL} AS achievement_total,
    ${ACHIEVEMENT_EARNED_SQL} AS achievement_earned
  FROM user_games ug
  INNER JOIN games g ON g.id = ug.game_id
`;

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
  query: GameListQuery,
): Promise<PaginatedResult<UserGameWithDetails>> {
  const { sql: filterSql, params: filterParams } = buildGameFilters(query);
  const where = filterSql.replace("ug.user_id = ?", "ug.user_id = ?");
  const baseParams = [userId, ...filterParams];

  const countRows = await executeQuery<{ total: number }[]>(
    `SELECT COUNT(*) AS total FROM user_games ug
     INNER JOIN games g ON g.id = ug.game_id
     WHERE ${where}`,
    baseParams,
  );
  const total = Number(countRows[0]?.total ?? 0);

  const orderBy = gameOrderBy(query.sort, query.order);
  const rows = await executeQuery<UserGameWithDetails[]>(
    `${GAME_SELECT}
     WHERE ${where}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...baseParams, query.limit, query.offset],
  );

  return { items: rows, total, limit: query.limit, offset: query.offset };
}

/** @deprecated Use listUserGames with query object */
export async function listUserGamesLegacy(
  userId: number,
  platform?: string,
): Promise<UserGameWithDetails[]> {
  const result = await listUserGames(userId, {
    platform: platform as GameListQuery["platform"],
    completion: "all",
    sort: "lastPlayed",
    order: "desc",
    limit: 1000,
    offset: 0,
  });
  return result.items;
}
