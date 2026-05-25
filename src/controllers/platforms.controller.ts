import type { Request, Response } from "express";
import { executeQuery } from "../repositories/execute.js";
import type { PlatformData } from "../interfaces/db.interface.js";

export async function listPlatforms(
  _req: Request,
  res: Response,
): Promise<void> {
  const platforms = await executeQuery<PlatformData[]>(
    "SELECT id, create_time, name, description FROM platforms ORDER BY name",
  );
  res.json({ platforms });
}
