import { z } from "zod";

export const accountPlatformSchema = z.enum(["xbox", "steam", "retro", "psn"]);

export const linkAccountSchema = z.object({
  externalUserId: z.string().min(1).optional(),
  externalUsername: z.string().optional(),
  credentials: z.record(z.string(), z.unknown()).default({}),
});
