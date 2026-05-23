import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { UserData } from "../interfaces/db.interface.js";
import * as userRepo from "../repositories/user.repository.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-jwt-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";

export interface AuthTokenPayload {
  sub: number;
  email: string;
}

export async function registerUser(
  email: string,
  password: string,
  displayName: string,
): Promise<{ userId: number; token: string }> {
  const existing = await userRepo.findUserByEmail(email);
  if (existing) {
    throw new Error("Email already registered");
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const userId = await userRepo.createUser(email, passwordHash, displayName);
  const token = signToken({ sub: userId, email });
  return { userId, token };
}

export async function loginUser(
  email: string,
  password: string,
): Promise<{ user: Omit<UserData, "password_hash">; token: string }> {
  const user = await userRepo.findUserByEmail(email);
  if (!user) {
    throw new Error("Invalid email or password");
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new Error("Invalid email or password");
  }
  const token = signToken({ sub: user.id, email: user.email });
  const { password_hash: _, ...safeUser } = user;
  return { user: safeUser, token };
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET);
  return decoded as unknown as AuthTokenPayload;
}
