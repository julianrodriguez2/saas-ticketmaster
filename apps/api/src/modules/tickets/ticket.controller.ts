import type { NextFunction, Request, Response } from "express";
import {
  checkInTicket,
  getTicketByCode,
  getTicketById,
  lookupTicketForAdmin,
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

export async function lookupTicketHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const ticketCode =
    typeof req.query.code === "string" ? req.query.code.trim() : "";

  if (!ticketCode) {
    res.status(400).json({ message: "Ticket code is required." });
    return;
  }

  try {
    const ticket = await lookupTicketForAdmin(ticketCode);
    res.status(200).json({ ticket });
  } catch (error) {
    if (error instanceof TicketServiceError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }

    next(error);
  }
}

export async function checkInTicketHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ticket = await checkInTicket(req.params.id);
    res.status(200).json({ ticket });
  } catch (error) {
    if (error instanceof TicketServiceError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }

    next(error);
  }
}
