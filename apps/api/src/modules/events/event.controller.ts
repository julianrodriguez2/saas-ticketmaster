import type { NextFunction, Request, Response } from "express";
import {
  EventServiceError,
  createEvent,
  getEventById,
  listEvents
} from "./event.service";

export async function createEventHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const event = await createEvent(req.body);
    res.status(201).json({ event });
  } catch (error) {
    handleEventError(error, res, next);
  }
}

export async function listEventsHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const events = await listEvents();
    res.status(200).json({ events });
  } catch (error) {
    handleEventError(error, res, next);
  }
}

export async function getEventByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const event = await getEventById(req.params.id);
    res.status(200).json({ event });
  } catch (error) {
    handleEventError(error, res, next);
  }
}

function handleEventError(
  error: unknown,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof EventServiceError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  next(error);
}

