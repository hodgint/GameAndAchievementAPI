import type { Request } from "express";
import { z } from "zod";

/** Parse flat query strings from Express into a Zod schema. */
export function parseListQuery<T extends z.ZodTypeAny>(
  schema: T,
  req: Request,
): z.infer<T> {
  return schema.parse(req.query);
}
