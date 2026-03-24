import type { NextFunction, Request, Response } from "express";
import {
  getAdminSeatMap,
  getEventAvailability,
  getPublicSeatMap,
  replaceSeatMap,
  validateSelection
} from "./seatmap.service";

export async function replaceSeatMapHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const seatMap = await replaceSeatMap(req.params.eventId, req.body);
    res.status(200).json({ seatMap });
  } catch (error) {
    next(error);
  }
}

export async function getAdminSeatMapHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const seatMap = await getAdminSeatMap(req.params.eventId);
    res.status(200).json({ seatMap });
  } catch (error) {
    next(error);
  }
}

export async function getPublicSeatMapHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const seatMap = await getPublicSeatMap(req.params.eventId);
    res.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=30");
    res.status(200).json({ seatMap });
  } catch (error) {
    next(error);
  }
}

export async function getEventAvailabilityHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const availability = await getEventAvailability(req.params.eventId);
    res.setHeader("Cache-Control", "public, max-age=10, stale-while-revalidate=20");
    res.status(200).json({ availability });
  } catch (error) {
    next(error);
  }
}

export async function validateSelectionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validation = await validateSelection(req.params.eventId, req.body);
    res.status(200).json({ validation });
  } catch (error) {
    next(error);
  }
}
