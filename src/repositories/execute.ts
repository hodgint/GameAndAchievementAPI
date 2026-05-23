import type { PoolConnection, UpsertResult } from "mariadb";
import { pool } from "../config/db.js";

export class DbError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DbError";
  }
}

export async function executeQuery<T = unknown>(
  sql: string,
  params: unknown[] = [],
): Promise<T> {
  let conn: PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query<T>(sql, params);
    return rows;
  } catch (err) {
    throw new DbError(`Query failed: ${sql}`, err);
  } finally {
    if (conn) conn.release();
  }
}

export async function executeMutation(
  sql: string,
  params: unknown[] = [],
): Promise<UpsertResult> {
  let conn: PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    return await conn.query<UpsertResult>(sql, params);
  } catch (err) {
    throw new DbError(`Mutation failed: ${sql}`, err);
  } finally {
    if (conn) conn.release();
  }
}

export async function withTransaction<T>(
  fn: (conn: PoolConnection) => Promise<T>,
): Promise<T> {
  let conn: PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (conn) conn.release();
  }
}
