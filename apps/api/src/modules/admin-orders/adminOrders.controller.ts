import type { NextFunction, Request, Response } from "express";
import {
  AdminOrdersServiceError,
  exportAdminOrdersCsv,
  getAdminOrderById,
  listAdminOrders
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
    if (error instanceof AdminOrdersServiceError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }

    next(error);
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
    if (error instanceof AdminOrdersServiceError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }

    next(error);
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
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`
    );
    res.status(200).send(result.csv);
  } catch (error) {
    if (error instanceof AdminOrdersServiceError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }

    next(error);
  }
}
