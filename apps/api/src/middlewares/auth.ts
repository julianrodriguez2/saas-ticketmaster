import type { NextFunction, Request, Response } from "express";
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
  res: Response,
  next: NextFunction
): void {
  const authPayload = authenticateRequest(req, res);

  if (!authPayload) {
    return;
  }

  req.user = authPayload;
  next();
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authPayload = authenticateRequest(req, res);

  if (!authPayload) {
    return;
  }

  if (authPayload.role !== "ADMIN") {
    res.status(403).json({ message: "Admin access required." });
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
  req: Request,
  res: Response
): AuthTokenPayload | null {
  const authPayload = readAuthPayload(req);

  if (!authPayload) {
    res.status(401).json({ message: "Authentication required." });
    return null;
  }

  return authPayload;
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
