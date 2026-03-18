import type { NextFunction, Request, Response } from "express";
import {
  SeatMapServiceError,
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
    handleSeatMapError(error, res, next);
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
    handleSeatMapError(error, res, next);
  }
}

export async function getPublicSeatMapHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const seatMap = await getPublicSeatMap(req.params.eventId);
    res.status(200).json({ seatMap });
  } catch (error) {
    handleSeatMapError(error, res, next);
  }
}

export async function getEventAvailabilityHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const availability = await getEventAvailability(req.params.eventId);
    res.status(200).json({ availability });
  } catch (error) {
    handleSeatMapError(error, res, next);
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
    handleSeatMapError(error, res, next);
  }
}

function handleSeatMapError(
  error: unknown,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof SeatMapServiceError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  next(error);
}