import type { NextFunction, Request, Response } from "express";
import {
  createEvent,
  getEventById,
  listEvents,
  listRecommendedEvents
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
    next(error);
  }
}

export async function listEventsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await listEvents(req.query);
    res.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=30");
    res.status(200).json({
      data: result.data,
      meta: result.meta,
      events: result.data
    });
  } catch (error) {
    next(error);
  }
}

export async function listRecommendedEventsHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const events = await listRecommendedEvents();
    res.setHeader("Cache-Control", "public, max-age=20, stale-while-revalidate=40");
    res.status(200).json({ events });
  } catch (error) {
    next(error);
  }
}

export async function getEventByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const event = await getEventById(req.params.id);
    res.setHeader("Cache-Control", "public, max-age=20, stale-while-revalidate=40");
    res.status(200).json({ event });
  } catch (error) {
    next(error);
  }
}
