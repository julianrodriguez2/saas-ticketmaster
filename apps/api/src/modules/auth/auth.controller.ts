import type { NextFunction, Request, Response } from "express";
import {
  AuthServiceError,
  getAuthCookieName,
  getAuthCookieOptions,
  getAuthenticatedUser,
  getClearAuthCookieOptions,
  loginUser,
  registerUser
} from "./auth.service";

export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await registerUser(req.body);
    res.status(201).json({ success: true, user });
  } catch (error) {
    handleAuthError(error, res, next);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { token, user } = await loginUser(req.body);

    res.cookie(getAuthCookieName(), token, getAuthCookieOptions());
    res.status(200).json({ user });
  } catch (error) {
    handleAuthError(error, res, next);
  }
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie(getAuthCookieName(), getClearAuthCookieOptions());
  res.status(200).json({ success: true });
}

export async function me(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  try {
    const user = await getAuthenticatedUser(req.user.userId);
    res.status(200).json({ user });
  } catch (error) {
    handleAuthError(error, res, next);
  }
}

function handleAuthError(
  error: unknown,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof AuthServiceError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  next(error);
}
