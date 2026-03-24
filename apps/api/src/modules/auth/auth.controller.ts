import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../errors/AppError";
import {
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
    next(error);
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
    next(error);
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
    next(
      new AppError({
        statusCode: 401,
        message: "Authentication required.",
        code: "AUTH_REQUIRED"
      })
    );
    return;
  }

  try {
    const user = await getAuthenticatedUser(req.user.userId);
    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
}
