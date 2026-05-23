import type { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service.js";
import { loginSchema, registerSchema } from "../validators/auth.validator.js";

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = registerSchema.parse(req.body);
    const result = await authService.registerUser(
      body.email,
      body.password,
      body.displayName,
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = loginSchema.parse(req.body);
    const result = await authService.loginUser(body.email, body.password);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
