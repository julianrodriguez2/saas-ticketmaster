import type { NextFunction, Request, Response } from "express";
import { createCheckoutSession, CheckoutServiceError } from "./checkout.service";

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

    const session = await createCheckoutSession(req.body, req.user?.userId, {
      ipAddress: forwardedIp ?? req.ip ?? null,
      userAgent: req.get("user-agent") ?? null
    });
    res.status(201).json({ session });
  } catch (error) {
    if (error instanceof CheckoutServiceError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }

    next(error);
  }
}
