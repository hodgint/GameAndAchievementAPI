import type { UserData } from "../interfaces/db.interface.js";
import { executeMutation, executeQuery } from "./execute.js";

export async function findUserByEmail(
  email: string,
): Promise<UserData | null> {
  const rows = await executeQuery<UserData[]>(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [email],
  );
  return rows[0] ?? null;
}

export async function findUserById(id: number): Promise<UserData | null> {
  const rows = await executeQuery<UserData[]>(
    "SELECT * FROM users WHERE id = ? LIMIT 1",
    [id],
  );
  return rows[0] ?? null;
}

export async function createUser(
  email: string,
  passwordHash: string,
  displayName: string,
): Promise<number> {
  const result = await executeMutation(
    "INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)",
    [email, passwordHash, displayName],
  );
  return Number(result.insertId);
}
