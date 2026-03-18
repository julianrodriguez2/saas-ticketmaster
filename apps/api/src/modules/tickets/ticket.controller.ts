import type { NextFunction, Request, Response } from "express";
import {
  getTicketByCode,
  getTicketById,
  TicketServiceError
} from "./ticket.service";

export async function getTicketByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  try {
    const ticket = await getTicketById(req.params.id, {
      userId: req.user.userId,
      role: req.user.role
    });

    res.status(200).json({ ticket });
  } catch (error) {
    if (error instanceof TicketServiceError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }

    next(error);
  }
}

export async function getTicketByCodeHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ticket = await getTicketByCode(req.params.code);
    res.status(200).json({ ticket });
  } catch (error) {
    if (error instanceof TicketServiceError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }

    next(error);
  }
}
