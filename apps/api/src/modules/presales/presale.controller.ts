import type { NextFunction, Request, Response } from "express";
import {
  PresaleServiceError,
  createPresaleRule,
  deletePresaleRule,
  listPresaleRules,
  updatePresaleRule,
  validatePresaleAccess
} from "./presale.service";

export async function createPresaleRuleHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const presale = await createPresaleRule(req.params.eventId, req.body);
    res.status(201).json({ presale });
  } catch (error) {
    handlePresaleError(error, res, next);
  }
}

export async function listPresaleRulesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const presales = await listPresaleRules(req.params.eventId);
    res.status(200).json({ presales });
  } catch (error) {
    handlePresaleError(error, res, next);
  }
}

export async function updatePresaleRuleHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const presale = await updatePresaleRule(req.params.id, req.body);
    res.status(200).json({ presale });
  } catch (error) {
    handlePresaleError(error, res, next);
  }
}

export async function deletePresaleRuleHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await deletePresaleRule(req.params.id);
    res.status(200).json({ success: true });
  } catch (error) {
    handlePresaleError(error, res, next);
  }
}

export async function validatePresaleAccessHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validation = await validatePresaleAccess(req.params.eventId, req.body);
    res.status(200).json({ validation });
  } catch (error) {
    handlePresaleError(error, res, next);
  }
}

function handlePresaleError(
  error: unknown,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof PresaleServiceError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  next(error);
}
