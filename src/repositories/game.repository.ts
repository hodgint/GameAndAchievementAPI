import type { AccountPlatform, GameData } from "../interfaces/db.interface.js";
import type { PoolConnection } from "mariadb";
import { executeMutation, executeQuery } from "./execute.js";

export interface UpsertGameInput {
  name: string;
  accountPlatform: AccountPlatform;
  externalId: string;
  platformId?: number | null;
  description?: string | null;
  publisher?: string | null;
  developer?: string | null;
  releaseDate?: Date | null;
  imageUrl?: string | null;
}

export async function findGameByExternalId(
  accountPlatform: AccountPlatform,
  externalId: string,
): Promise<GameData | null> {
  const rows = await executeQuery<GameData[]>(
    "SELECT * FROM games WHERE account_platform = ? AND external_id = ? LIMIT 1",
    [accountPlatform, externalId],
  );
  return rows[0] ?? null;
}

export async function upsertGame(
  input: UpsertGameInput,
  conn?: PoolConnection,
): Promise<number> {
  const sql = `
    INSERT INTO games (
      name, platform_id, account_platform, external_id,
      description, publisher, developer, release_date, image_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      platform_id = COALESCE(VALUES(platform_id), platform_id),
      description = COALESCE(VALUES(description), description),
      publisher = COALESCE(VALUES(publisher), publisher),
      developer = COALESCE(VALUES(developer), developer),
      release_date = COALESCE(VALUES(release_date), release_date),
      image_url = COALESCE(VALUES(image_url), image_url)
  `;
  const params = [
    input.name,
    input.platformId ?? null,
    input.accountPlatform,
    input.externalId,
    input.description ?? null,
    input.publisher ?? null,
    input.developer ?? null,
    input.releaseDate ?? null,
    input.imageUrl ?? null,
  ];

  if (conn) {
    await conn.query(sql, params);
  } else {
    await executeMutation(sql, params);
  }

  const existing = conn
    ? (
        await conn.query<GameData[]>(
          "SELECT id FROM games WHERE account_platform = ? AND external_id = ? LIMIT 1",
          [input.accountPlatform, input.externalId],
        )
      )[0]
    : await findGameByExternalId(input.accountPlatform, input.externalId);

  return Number(existing?.id);
}

export async function getAllGames(): Promise<GameData[]> {
  return executeQuery<GameData[]>("SELECT * FROM games ORDER BY name");
}

export async function getGamesByPlatformId(
  platformId: number,
): Promise<GameData[]> {
  return executeQuery<GameData[]>(
    "SELECT * FROM games WHERE platform_id = ? ORDER BY name",
    [platformId],
  );
}

export async function insertPlatform(
  name: string,
  description: string,
): Promise<number> {
  const result = await executeMutation(
    "INSERT INTO platforms (name, description) VALUES (?, ?)",
    [name, description],
  );
  return Number(result.insertId);
}
