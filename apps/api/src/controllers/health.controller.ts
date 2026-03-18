import type { NextFunction, Request, Response } from "express";
import { getHealthPayload } from "../services/health.service";

export async function getHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload = await getHealthPayload();
    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
}
