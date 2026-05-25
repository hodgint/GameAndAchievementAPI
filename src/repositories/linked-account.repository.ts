import type {
  AccountListQuery,
  PaginatedResult,
} from "../interfaces/list-query.interface.js";
import type {
  AccountPlatform,
  LinkedAccountData,
} from "../interfaces/db.interface.js";
import { executeMutation, executeQuery } from "./execute.js";

function accountOrderBy(
  sort: AccountListQuery["sort"],
  order: AccountListQuery["order"],
): string {
  const dir = order === "asc" ? "ASC" : "DESC";
  switch (sort) {
    case "username":
      return `external_username ${dir}, platform ASC`;
    case "linkedAt":
      return `linked_at ${dir}`;
    case "platform":
    default:
      return `platform ${dir}`;
  }
}

export async function findLinkedAccount(
  userId: number,
  platform: AccountPlatform,
): Promise<LinkedAccountData | null> {
  const rows = await executeQuery<LinkedAccountData[]>(
    "SELECT * FROM linked_accounts WHERE user_id = ? AND platform = ? LIMIT 1",
    [userId, platform],
  );
  return rows[0] ?? null;
}

export async function listLinkedAccounts(
  userId: number,
  query: AccountListQuery,
): Promise<PaginatedResult<LinkedAccountData>> {
  const clauses: string[] = ["user_id = ?"];
  const params: unknown[] = [userId];

  if (query.platform) {
    clauses.push("platform = ?");
    params.push(query.platform);
  }
  if (query.search) {
    clauses.push(
      "(external_username LIKE ? OR external_user_id LIKE ? OR platform LIKE ?)",
    );
    const term = `%${query.search}%`;
    params.push(term, term, term);
  }

  const where = clauses.join(" AND ");
  const countRows = await executeQuery<{ total: number }[]>(
    `SELECT COUNT(*) AS total FROM linked_accounts WHERE ${where}`,
    params,
  );
  const total = Number(countRows[0]?.total ?? 0);

  const orderBy = accountOrderBy(query.sort, query.order);
  const rows = await executeQuery<LinkedAccountData[]>(
    `SELECT id, user_id, platform, external_user_id, external_username,
            linked_at, updated_at
     FROM linked_accounts
     WHERE ${where}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, query.limit, query.offset],
  );

  return { items: rows, total, limit: query.limit, offset: query.offset };
}

export async function upsertLinkedAccount(input: {
  userId: number;
  platform: AccountPlatform;
  externalUserId: string;
  externalUsername?: string | null;
  credentialsEncrypted: string;
}): Promise<void> {
  await executeMutation(
    `INSERT INTO linked_accounts (
      user_id, platform, external_user_id, external_username, credentials_encrypted
    ) VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      external_user_id = VALUES(external_user_id),
      external_username = COALESCE(VALUES(external_username), external_username),
      credentials_encrypted = VALUES(credentials_encrypted),
      updated_at = CURRENT_TIMESTAMP`,
    [
      input.userId,
      input.platform,
      input.externalUserId,
      input.externalUsername ?? null,
      input.credentialsEncrypted,
    ],
  );
}

export async function deleteLinkedAccount(
  userId: number,
  platform: AccountPlatform,
): Promise<boolean> {
  const result = await executeMutation(
    "DELETE FROM linked_accounts WHERE user_id = ? AND platform = ?",
    [userId, platform],
  );
  return result.affectedRows > 0;
}
