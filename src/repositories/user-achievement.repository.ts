import type {
  AchievementListQuery,
  PaginatedResult,
} from "../interfaces/list-query.interface.js";
import type { UserAchievementWithDetails } from "../interfaces/db.interface.js";
import type { PoolConnection } from "mariadb";
import { executeMutation, executeQuery } from "./execute.js";
import * as userGameRepo from "./user-game.repository.js";

function achievementOrderBy(
  sort: AchievementListQuery["sort"],
  order: AchievementListQuery["order"],
): string {
  const dir = order === "asc" ? "ASC" : "DESC";
  switch (sort) {
    case "name":
      return `a.name ${dir}`;
    case "points":
      return `a.points ${dir}`;
    case "gameName":
      return `g.name ${dir}, ua.date_earned DESC`;
    case "dateEarned":
    default:
      return `ua.date_earned ${dir}`;
  }
}

function buildAchievementFilters(
  query: AchievementListQuery,
): { sql: string; params: unknown[] } {
  const clauses: string[] = ["ua.user_id = ?"];
  const params: unknown[] = [];

  if (query.platform) {
    clauses.push("a.platform = ?");
    params.push(query.platform);
  }
  if (query.gameId !== undefined) {
    clauses.push("g.id = ?");
    params.push(query.gameId);
  }
  if (query.search) {
    clauses.push(
      "(a.name LIKE ? OR a.description LIKE ? OR g.name LIKE ?)",
    );
    const term = `%${query.search}%`;
    params.push(term, term, term);
  }
  if (query.from) {
    clauses.push("ua.date_earned >= ?");
    params.push(query.from);
  }
  if (query.to) {
    clauses.push("ua.date_earned <= ?");
    params.push(query.to);
  }
  if (query.minPoints !== undefined) {
    clauses.push("a.points >= ?");
    params.push(query.minPoints);
  }

  return { sql: clauses.join(" AND "), params };
}

const ACHIEVEMENT_SELECT = `
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
`;

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

  const gameRows = conn
    ? await conn.query<{ game_id: number }[]>(
        "SELECT game_id FROM achievements WHERE id = ? LIMIT 1",
        [input.achievementId],
      )
    : await executeQuery<{ game_id: number }[]>(
        "SELECT game_id FROM achievements WHERE id = ? LIMIT 1",
        [input.achievementId],
      );
  const gameId = gameRows[0]?.game_id;
  if (gameId) {
    await userGameRepo.refreshGameProgress(input.userId, gameId, conn);
  }
}

export async function listUserAchievements(
  userId: number,
  query: AchievementListQuery,
): Promise<PaginatedResult<UserAchievementWithDetails>> {
  const { sql: filterSql, params: filterParams } = buildAchievementFilters(query);
  const baseParams = [userId, ...filterParams];

  const countRows = await executeQuery<{ total: number }[]>(
    `SELECT COUNT(*) AS total
     FROM user_achievements ua
     INNER JOIN achievements a ON a.id = ua.achievement_id
     INNER JOIN games g ON g.id = a.game_id
     WHERE ${filterSql}`,
    baseParams,
  );
  const total = Number(countRows[0]?.total ?? 0);

  const orderBy = achievementOrderBy(query.sort, query.order);
  const rows = await executeQuery<UserAchievementWithDetails[]>(
    `${ACHIEVEMENT_SELECT}
     WHERE ${filterSql}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...baseParams, query.limit, query.offset],
  );

  return { items: rows, total, limit: query.limit, offset: query.offset };
}
