import type { NextFunction, Request, Response } from "express";
import {
  getOrderById,
  listOrdersForUser,
  OrderServiceError
} from "./order.service";

export async function listOrdersHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  try {
    const orders = await listOrdersForUser(req.user.userId);
    res.status(200).json({ orders });
  } catch (error) {
    if (error instanceof OrderServiceError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }

    next(error);
  }
}

export async function getOrderByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  try {
    const order = await getOrderById(req.params.orderId, {
      userId: req.user.userId,
      role: req.user.role
    });

    res.status(200).json({ order });
  } catch (error) {
    if (error instanceof OrderServiceError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }

    next(error);
  }
}
