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

export async function upsertAchievement(
  input: UpsertAchievementInput,
  conn?: PoolConnection,
): Promise<number> {
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
