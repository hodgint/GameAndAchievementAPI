import type {
  AccountPlatform,
  LinkedAccountData,
} from "../interfaces/db.interface.js";
import { executeMutation, executeQuery } from "./execute.js";

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
): Promise<LinkedAccountData[]> {
  return executeQuery<LinkedAccountData[]>(
    "SELECT * FROM linked_accounts WHERE user_id = ? ORDER BY platform",
    [userId],
  );
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
