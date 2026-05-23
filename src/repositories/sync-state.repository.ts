import type { AccountPlatform, SyncStateData } from "../interfaces/db.interface.js";
import { executeMutation, executeQuery } from "./execute.js";

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
