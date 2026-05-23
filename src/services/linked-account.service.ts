import type { AccountPlatform } from "../interfaces/db.interface.js";
import * as linkedAccountRepo from "../repositories/linked-account.repository.js";
import { decryptJson, encryptJson } from "../utils/crypto.js";

export async function saveLinkedCredentials(
  userId: number,
  platform: AccountPlatform,
  externalUserId: string,
  externalUsername: string | undefined,
  credentials: Record<string, unknown>,
): Promise<void> {
  await linkedAccountRepo.upsertLinkedAccount({
    userId,
    platform,
    externalUserId,
    externalUsername,
    credentialsEncrypted: encryptJson(credentials),
  });
}

export async function getLinkedCredentials<T extends Record<string, unknown>>(
  userId: number,
  platform: AccountPlatform,
): Promise<{ externalUserId: string; externalUsername: string | null; credentials: T } | null> {
  const account = await linkedAccountRepo.findLinkedAccount(userId, platform);
  if (!account) return null;
  return {
    externalUserId: account.external_user_id,
    externalUsername: account.external_username,
    credentials: decryptJson<T>(account.credentials_encrypted),
  };
}

export async function listLinkedAccountsPublic(userId: number) {
  const accounts = await linkedAccountRepo.listLinkedAccounts(userId);
  return accounts.map((a) => ({
    platform: a.platform,
    externalUserId: a.external_user_id,
    externalUsername: a.external_username,
    linkedAt: a.linked_at,
  }));
}
