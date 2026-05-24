import type {
  PaginatedResult,
  SyncListQuery,
} from "../interfaces/list-query.interface.js";
import type { AccountPlatform, SyncStateData } from "../interfaces/db.interface.js";
import { executeMutation, executeQuery } from "./execute.js";

function syncOrderBy(
  sort: SyncListQuery["sort"],
  order: SyncListQuery["order"],
): string {
  const dir = order === "asc" ? "ASC" : "DESC";
  switch (sort) {
    case "lastSyncAt":
      return `last_sync_at ${dir}`;
    case "status":
      return `status ${dir}, platform ASC`;
    case "platform":
    default:
      return `platform ${dir}`;
  }
}

export async function getSyncState(
  userId: number,
  platform: AccountPlatform,
): Promise<SyncStateData | null> {
  const rows = await executeQuery<SyncStateData[]>(
    "SELECT * FROM sync_state WHERE user_id = ? AND platform = ? LIMIT 1",
    [userId, platform],
  );
  return rows[0] ?? null;
}

export async function listSyncStates(
  userId: number,
  query: SyncListQuery,
): Promise<PaginatedResult<SyncStateData>> {
  const clauses: string[] = ["user_id = ?"];
  const params: unknown[] = [userId];

  if (query.platform) {
    clauses.push("platform = ?");
    params.push(query.platform);
  }
  if (query.status) {
    clauses.push("status = ?");
    params.push(query.status);
  }

  const where = clauses.join(" AND ");
  const countRows = await executeQuery<{ total: number }[]>(
    `SELECT COUNT(*) AS total FROM sync_state WHERE ${where}`,
    params,
  );
  const total = Number(countRows[0]?.total ?? 0);

  const orderBy = syncOrderBy(query.sort, query.order);
  const rows = await executeQuery<SyncStateData[]>(
    `SELECT * FROM sync_state WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, query.limit, query.offset],
  );

  return { items: rows, total, limit: query.limit, offset: query.offset };
}

export async function upsertSyncState(input: {
  userId: number;
  platform: AccountPlatform;
  status: SyncStateData["status"];
  lastSyncAt?: Date | null;
  cursorData?: string | null;
  errorMessage?: string | null;
}): Promise<void> {
  await executeMutation(
    `INSERT INTO sync_state (user_id, platform, status, last_sync_at, cursor_data, error_message)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       status = VALUES(status),
       last_sync_at = COALESCE(VALUES(last_sync_at), last_sync_at),
       cursor_data = COALESCE(VALUES(cursor_data), cursor_data),
       error_message = VALUES(error_message),
       updated_at = CURRENT_TIMESTAMP`,
    [
      input.userId,
      input.platform,
      input.status,
      input.lastSyncAt ?? null,
      input.cursorData ?? null,
      input.errorMessage ?? null,
    ],
  );
}
