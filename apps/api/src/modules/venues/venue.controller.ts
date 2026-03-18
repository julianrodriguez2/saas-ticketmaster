import type { NextFunction, Request, Response } from "express";
import {
  VenueServiceError,
  createVenue,
  listVenues
} from "./venue.service";

export async function createVenueHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const venue = await createVenue(req.body);
    res.status(201).json({ venue });
  } catch (error) {
    handleVenueError(error, res, next);
  }
}

export async function listVenuesHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const venues = await listVenues();
    res.status(200).json({ venues });
  } catch (error) {
    handleVenueError(error, res, next);
  }
}

function handleVenueError(
  error: unknown,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof VenueServiceError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  next(error);
}

