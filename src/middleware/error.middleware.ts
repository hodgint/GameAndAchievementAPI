import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

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
