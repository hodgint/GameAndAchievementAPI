import { z } from "zod";

export const updateProfileSchema = z
  .object({
    displayName: z.string().min(1).max(128).optional(),
    currentPassword: z.string().min(1).optional(),
    newPassword: z.string().min(8).optional(),
  })
  .refine(
    (data) => {
      if (data.newPassword && !data.currentPassword) return false;
      return true;
    },
    { message: "currentPassword is required when changing password" },
  );

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
