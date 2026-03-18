import type { NextFunction, Request, Response } from "express";
import {
  AdminAnalyticsServiceError,
  getAdminAnalyticsOverview,
  getEventAnalyticsDetail,
  getSalesVelocity,
  listEventPerformance
} from "./adminAnalytics.service";

export async function getAdminAnalyticsOverviewHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const overview = await getAdminAnalyticsOverview();
    res.status(200).json({ overview });
  } catch (error) {
    handleAnalyticsError(error, res, next);
  }
}

export async function listEventPerformanceHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const events = await listEventPerformance();
    res.status(200).json({ events });
  } catch (error) {
    handleAnalyticsError(error, res, next);
  }
}

export async function getEventAnalyticsDetailHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const analytics = await getEventAnalyticsDetail(req.params.eventId);
    res.status(200).json({ analytics });
  } catch (error) {
    handleAnalyticsError(error, res, next);
  }
}

export async function getSalesVelocityHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const velocity = await getSalesVelocity(req.query);
    res.status(200).json({ velocity });
  } catch (error) {
    handleAnalyticsError(error, res, next);
  }
}

function handleAnalyticsError(
  error: unknown,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof AdminAnalyticsServiceError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  next(error);
}
