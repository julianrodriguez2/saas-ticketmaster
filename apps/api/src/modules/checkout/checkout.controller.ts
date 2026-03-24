import type { NextFunction, Request, Response } from "express";
import { createCheckoutSession } from "./checkout.service";

export async function createCheckoutSessionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const forwardedFor = req.headers["x-forwarded-for"];
    const forwardedIp =
      typeof forwardedFor === "string"
        ? forwardedFor.split(",")[0]?.trim()
        : Array.isArray(forwardedFor)
          ? forwardedFor[0]
          : undefined;

    const idempotencyHeader = req.headers["idempotency-key"];
    const idempotencyKey =
      typeof idempotencyHeader === "string"
        ? idempotencyHeader
        : Array.isArray(idempotencyHeader)
          ? idempotencyHeader[0]
          : undefined;

    const session = await createCheckoutSession(req.body, req.user?.userId, {
      ipAddress: forwardedIp ?? req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
      idempotencyKey
    });
    res.status(201).json({ session });
  } catch (error) {
    next(error);
  }
}
