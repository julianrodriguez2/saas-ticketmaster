import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";
import { logInfo } from "../utils/logger";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const existingRequestId = req.header("x-request-id");
  const requestId =
    typeof existingRequestId === "string" && existingRequestId.trim()
      ? existingRequestId.trim().slice(0, 120)
      : randomUUID();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  const requestStart = Date.now();
  logInfo("request.start", {
    requestId,
    method: req.method,
    path: req.originalUrl
  });

  res.on("finish", () => {
    const durationMs = Date.now() - requestStart;
    logInfo("request.end", {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs
    });
  });

  next();
}

