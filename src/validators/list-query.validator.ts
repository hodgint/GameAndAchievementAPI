import { z } from "zod";
import { accountPlatformSchema } from "./account.validator.js";

const sortOrderSchema = z.enum(["asc", "desc"]).default("desc");

const paginationSchema = {
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
};

const optionalPositiveInt = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}, z.number().int().positive().optional());

const optionalNonNegativeInt = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}, z.number().int().min(0).optional());

const optionalDate = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null) return undefined;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
}, z.date().optional());

const optionalPlatform = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null) return undefined;
  return value;
}, accountPlatformSchema.optional());

export const gameListQuerySchema = z.object({
  ...paginationSchema,
  q: z.string().trim().min(1).optional(),
  platform: optionalPlatform,
  completion: z
    .enum(["all", "complete", "in_progress", "none"])
    .default("all"),
  sort: z
    .enum(["name", "lastPlayed", "playtime", "completion", "dateOwned"])
    .default("lastPlayed"),
  order: sortOrderSchema,
  minPlaytime: optionalNonNegativeInt,
  hasAchievements: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export const achievementListQuerySchema = z.object({
  ...paginationSchema,
  q: z.string().trim().min(1).optional(),
  platform: optionalPlatform,
  gameId: optionalPositiveInt,
  from: optionalDate,
  to: optionalDate,
  minPoints: optionalNonNegativeInt,
  sort: z
    .enum(["dateEarned", "name", "points", "gameName"])
    .default("dateEarned"),
  order: sortOrderSchema,
});

export const accountListQuerySchema = z.object({
  ...paginationSchema,
  q: z.string().trim().min(1).optional(),
  platform: optionalPlatform,
  sort: z.enum(["platform", "username", "linkedAt"]).default("platform"),
  order: sortOrderSchema,
});

export const syncListQuerySchema = z.object({
  ...paginationSchema,
  platform: optionalPlatform,
  status: z.preprocess((value) => {
    if (value === "" || value === undefined || value === null) return undefined;
    return value;
  }, z.enum(["idle", "running", "success", "error"]).optional()),
  sort: z.enum(["platform", "lastSyncAt", "status"]).default("platform"),
  order: sortOrderSchema,
});
