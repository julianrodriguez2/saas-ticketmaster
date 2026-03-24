import type { NextFunction, Request, Response } from "express";
import {
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
    res.status(200).json({
      data: result.notifications,
      meta: result.pagination,
      notifications: result.notifications,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
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
    next(error);
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
    next(error);
  }
}
