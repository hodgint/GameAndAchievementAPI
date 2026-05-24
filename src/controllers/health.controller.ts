import type { Request, Response } from "express";
import { pool } from "../config/db.js";

export async function healthCheck(_req: Request, res: Response): Promise<void> {
  let dbOk = false;
  try {
    const conn = await pool.getConnection();
    await conn.query("SELECT 1");
    conn.release();
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const status = dbOk ? "ok" : "degraded";
  res.status(dbOk ? 200 : 503).json({
    status,
    database: dbOk ? "connected" : "unavailable",
    timestamp: new Date().toISOString(),
  });
}
