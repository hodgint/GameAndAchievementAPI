import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  dbLocal: z.string().optional(),
  dbUsername: z.string().optional(),
  dbPassword: z.string().optional(),
  dbName: z.string().optional(),
  DB_POOL_SIZE: z.coerce.number().int().min(1).max(100).default(10),
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default("7d"),
  TOKEN_ENCRYPTION_KEY: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
    throw new Error("Environment validation failed");
  }

  const env = parsed.data;
  if (env.NODE_ENV === "production") {
    if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
      throw new Error("JWT_SECRET must be set (32+ chars) in production");
    }
    if (!env.TOKEN_ENCRYPTION_KEY || env.TOKEN_ENCRYPTION_KEY.length < 32) {
      throw new Error(
        "TOKEN_ENCRYPTION_KEY must be set (32+ chars) in production",
      );
    }
    if (!env.dbName || !env.dbUsername) {
      throw new Error("Database configuration required in production");
    }
  }

  cached = env;
  return env;
}
