import type { NextFunction, Request, Response } from "express";
import {
  AdminAttendeesServiceError,
  exportEventAttendeesCsv,
  listEventAttendees
} from "./adminAttendees.service";

export async function listEventAttendeesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await listEventAttendees(req.params.eventId, req.query);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof AdminAttendeesServiceError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }

    next(error);
  }
}

export async function exportEventAttendeesCsvHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await exportEventAttendeesCsv(req.params.eventId, req.query);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`
    );
    res.status(200).send(result.csv);
  } catch (error) {
    if (error instanceof AdminAttendeesServiceError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }

    next(error);
  }
}
