import type { NextFunction, Request, Response } from "express";
import { getOrderById, OrderServiceError } from "./order.service";

export async function getOrderByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const order = await getOrderById(
      req.params.orderId,
      req.user
        ? {
            userId: req.user.userId,
            role: req.user.role
          }
        : null
    );

    res.status(200).json({ order });
  } catch (error) {
    if (error instanceof OrderServiceError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }

    next(error);
  }
}
