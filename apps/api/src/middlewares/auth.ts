import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import {
  AuthServiceError,
  getAuthCookieName,
  type AuthTokenPayload,
  verifyAuthToken
} from "../modules/auth/auth.service";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: "USER" | "ADMIN";
      };
    }
  }
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authPayload = authenticateRequest(req);

  if (!authPayload) {
    next(
      new AppError({
        statusCode: 401,
        message: "Authentication required.",
        code: "AUTH_REQUIRED"
      })
    );
    return;
  }

  req.user = authPayload;
  next();
}

export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authPayload = authenticateRequest(req);

  if (!authPayload) {
    next(
      new AppError({
        statusCode: 401,
        message: "Authentication required.",
        code: "AUTH_REQUIRED"
      })
    );
    return;
  }

  if (authPayload.role !== "ADMIN") {
    next(
      new AppError({
        statusCode: 403,
        message: "Admin access required.",
        code: "ADMIN_REQUIRED"
      })
    );
    return;
  }

  req.user = authPayload;
  next();
}

export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  req.user = readAuthPayload(req) ?? undefined;
  next();
}

function authenticateRequest(
  req: Request
): AuthTokenPayload | null {
  const authPayload = readAuthPayload(req);

  return authPayload ?? null;
}

function readAuthPayload(req: Request): AuthTokenPayload | null {
  const token = req.cookies?.[getAuthCookieName()];

  if (!token || typeof token !== "string") {
    return null;
  }

  try {
    return verifyAuthToken(token);
  } catch (error) {
    if (error instanceof AuthServiceError && error.statusCode === 401) {
      return null;
    }

    throw error;
  }
}
