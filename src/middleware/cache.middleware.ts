import type { NextFunction, Request, Response } from "express";

/** Short private cache for read-heavy list endpoints. */
export function privateCache(seconds = 30) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader("Cache-Control", `private, max-age=${seconds}`);
    next();
  };
}
