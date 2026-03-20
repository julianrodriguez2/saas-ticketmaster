import type { NextFunction, Request, Response } from "express";
import {
  AdminNotificationServiceError,
  listAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead
} from "./adminNotification.service";

export async function listAdminNotificationsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await listAdminNotifications(req.query);
    res.status(200).json(result);
  } catch (error) {
    handleAdminNotificationError(error, res, next);
  }
}

export async function markAdminNotificationReadHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const notification = await markAdminNotificationRead(req.params.id);
    res.status(200).json({ notification });
  } catch (error) {
    handleAdminNotificationError(error, res, next);
  }
}

export async function markAllAdminNotificationsReadHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await markAllAdminNotificationsRead();
    res.status(200).json(result);
  } catch (error) {
    handleAdminNotificationError(error, res, next);
  }
}

function handleAdminNotificationError(
  error: unknown,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof AdminNotificationServiceError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  next(error);
}
