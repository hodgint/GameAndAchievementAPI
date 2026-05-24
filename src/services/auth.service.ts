import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { UserData } from "../interfaces/db.interface.js";
import { loadEnv } from "../config/env.js";
import * as userRepo from "../repositories/user.repository.js";

export interface AuthTokenPayload {
  sub: number;
  email: string;
}

function getJwtSecret(): string {
  const env = loadEnv();
  return env.JWT_SECRET ?? "dev-jwt-secret-change-me";
}

function getJwtExpiresIn(): string {
  return loadEnv().JWT_EXPIRES_IN;
}

export async function registerUser(
  email: string,
  password: string,
  displayName: string,
): Promise<{ userId: number; token: string; refreshToken: string }> {
  const existing = await userRepo.findUserByEmail(email);
  if (existing) {
    throw new Error("Email already registered");
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const userId = await userRepo.createUser(email, passwordHash, displayName);
  const payload = { sub: userId, email };
  return {
    userId,
    token: signToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export async function loginUser(
  email: string,
  password: string,
): Promise<{
  user: Omit<UserData, "password_hash">;
  token: string;
  refreshToken: string;
}> {
  const user = await userRepo.findUserByEmail(email);
  if (!user) {
    throw new Error("Invalid email or password");
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new Error("Invalid email or password");
  }
  const payload = { sub: user.id, email: user.email };
  const { password_hash: _, ...safeUser } = user;
  return {
    user: safeUser,
    token: signToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: getJwtExpiresIn(),
  } as jwt.SignOptions);
}

export function signRefreshToken(payload: AuthTokenPayload): string {
  return jwt.sign({ ...payload, type: "refresh" }, getJwtSecret(), {
    expiresIn: "30d",
  });
}

export function verifyToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, getJwtSecret()) as jwt.JwtPayload & {
    sub: number;
    email: string;
    type?: string;
  };
  if (decoded.type === "refresh") {
    throw new Error("Invalid or expired token");
  }
  return { sub: Number(decoded.sub), email: decoded.email };
}

export function verifyRefreshToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, getJwtSecret()) as jwt.JwtPayload & {
    sub: number;
    email: string;
    type?: string;
  };
  if (decoded.type !== "refresh") {
    throw new Error("Invalid or expired token");
  }
  return { sub: Number(decoded.sub), email: decoded.email };
}

export function refreshAccessToken(refreshToken: string): {
  token: string;
  refreshToken: string;
} {
  const payload = verifyRefreshToken(refreshToken);
  return {
    token: signToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}
