import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { SyncConflictError } from "../errors/sync.errors.js";
import { AccountNotLinkedError } from "../errors/sync.errors.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Invalid query parameters",
      details: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof SyncConflictError) {
    res.status(409).json({
      error: err.message,
      syncState: err.syncState,
    });
    return;
  }

  if (err instanceof AccountNotLinkedError) {
    res.status(400).json({ error: err.message, platform: err.platform });
    return;
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  const status =
    message.includes("not linked") ||
    message.includes("required") ||
    message.includes("already registered") ||
    message.includes("Invalid email")
      ? 400
      : message.includes("Invalid or expired") || message.includes("Unauthorized")
        ? 401
        : 500;

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({ error: message });
}
