import type {
  AccountPlatform,
  AchievementRow,
} from "../interfaces/db.interface.js";
import type { PoolConnection } from "mariadb";
import { executeMutation, executeQuery } from "./execute.js";

export interface UpsertAchievementInput {
  gameId: number;
  platform: AccountPlatform;
  externalId: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  achievementType?: string | null;
  points?: number;
  sortOrder?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface GameAchievementBoardRow {
  id: number;
  external_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  achievement_type: string | null;
  points: number;
  sort_order: number | null;
  platform: AccountPlatform;
  earned: boolean;
  date_earned: Date | null;
  progress: number | null;
}

async function assertGamePlatformMatch(
  gameId: number,
  platform: AccountPlatform,
  conn?: PoolConnection,
): Promise<void> {
  const sql =
    "SELECT account_platform FROM games WHERE id = ? LIMIT 1";
  const rows = conn
    ? await conn.query<{ account_platform: AccountPlatform }[]>(sql, [
        gameId,
      ])
    : await executeQuery<{ account_platform: AccountPlatform }[]>(sql, [
        gameId,
      ]);
  const gamePlatform = rows[0]?.account_platform;
  if (!gamePlatform) {
    throw new Error(`Game ${gameId} not found`);
  }
  if (gamePlatform !== platform) {
    throw new Error(
      `Achievement platform ${platform} does not match game platform ${gamePlatform}`,
    );
  }
}

export async function upsertAchievement(
  input: UpsertAchievementInput,
  conn?: PoolConnection,
): Promise<number> {
  await assertGamePlatformMatch(input.gameId, input.platform, conn);

  const sql = `
    INSERT INTO achievements (
      game_id, platform, external_id, name, description, image_url,
      achievement_type, points, sort_order, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      description = COALESCE(VALUES(description), description),
      image_url = COALESCE(VALUES(image_url), image_url),
      achievement_type = COALESCE(VALUES(achievement_type), achievement_type),
      points = VALUES(points),
      sort_order = COALESCE(VALUES(sort_order), sort_order),
      metadata = COALESCE(VALUES(metadata), metadata)
  `;
  const params = [
    input.gameId,
    input.platform,
    input.externalId,
    input.name,
    input.description ?? null,
    input.imageUrl ?? null,
    input.achievementType ?? null,
    input.points ?? 0,
    input.sortOrder ?? null,
    input.metadata ? JSON.stringify(input.metadata) : null,
  ];

  if (conn) {
    await conn.query(sql, params);
    const rows = await conn.query<AchievementRow[]>(
      `SELECT id FROM achievements
       WHERE platform = ? AND game_id = ? AND external_id = ? LIMIT 1`,
      [input.platform, input.gameId, input.externalId],
    );
    return Number(rows[0]?.id);
  }

  await executeMutation(sql, params);
  const row = await findAchievementByExternalId(
    input.platform,
    input.gameId,
    input.externalId,
  );
  return Number(row?.id);
}

export async function findAchievementByExternalId(
  platform: AccountPlatform,
  gameId: number,
  externalId: string,
): Promise<AchievementRow | null> {
  const rows = await executeQuery<AchievementRow[]>(
    `SELECT * FROM achievements
     WHERE platform = ? AND game_id = ? AND external_id = ? LIMIT 1`,
    [platform, gameId, externalId],
  );
  const row = rows[0];
  if (row && typeof row.metadata === "string") {
    row.metadata = JSON.parse(row.metadata as unknown as string);
  }
  return row ?? null;
}

export async function listGameAchievementBoard(
  userId: number,
  gameId: number,
): Promise<GameAchievementBoardRow[]> {
  return executeQuery<GameAchievementBoardRow[]>(
    `SELECT
      a.id,
      a.external_id,
      a.name,
      a.description,
      a.image_url,
      a.achievement_type,
      a.points,
      a.sort_order,
      a.platform,
      CASE WHEN ua.id IS NOT NULL THEN 1 ELSE 0 END AS earned,
      ua.date_earned,
      ua.progress
    FROM achievements a
    LEFT JOIN user_achievements ua
      ON ua.achievement_id = a.id AND ua.user_id = ?
    WHERE a.game_id = ?
    ORDER BY a.sort_order ASC, a.id ASC`,
    [userId, gameId],
  );
}
