import type { NextFunction, Request, Response } from "express";
import {
  AdminOrdersServiceError,
  exportAdminOrdersCsv,
  getAdminOrderById,
  listAdminOrders,
  listFlaggedAdminOrders,
  reviewAdminOrder
} from "./adminOrders.service";

export async function listAdminOrdersHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await listAdminOrders(req.query);
    res.status(200).json(result);
  } catch (error) {
    handleAdminOrdersError(error, res, next);
  }
}

export async function listFlaggedAdminOrdersHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await listFlaggedAdminOrders(req.query);
    res.status(200).json(result);
  } catch (error) {
    handleAdminOrdersError(error, res, next);
  }
}

export async function getAdminOrderByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const order = await getAdminOrderById(req.params.id);
    res.status(200).json({ order });
  } catch (error) {
    handleAdminOrdersError(error, res, next);
  }
}

export async function reviewAdminOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  try {
    const review = await reviewAdminOrder(req.params.id, req.user.userId, req.body);
    res.status(200).json({ review });
  } catch (error) {
    handleAdminOrdersError(error, res, next);
  }
}

export async function exportAdminOrdersCsvHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await exportAdminOrdersCsv(req.query);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    res.status(200).send(result.csv);
  } catch (error) {
    handleAdminOrdersError(error, res, next);
  }
}

function handleAdminOrdersError(
  error: unknown,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof AdminOrdersServiceError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  next(error);
}
