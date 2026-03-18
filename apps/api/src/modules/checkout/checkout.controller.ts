import type { NextFunction, Request, Response } from "express";
import { createCheckoutSession, CheckoutServiceError } from "./checkout.service";

export async function createCheckoutSessionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await createCheckoutSession(req.body, req.user?.userId);
    res.status(201).json({ session });
  } catch (error) {
    if (error instanceof CheckoutServiceError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }

    next(error);
  }
}
