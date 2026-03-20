import type { NextFunction, Request, Response } from "express";
import {
  EventTemplateServiceError,
  applyTemplateToEvent,
  createEventTemplate,
  deleteEventTemplate,
  getEventTemplateById,
  listEventTemplates,
  updateEventTemplate
} from "./eventTemplate.service";

export async function listEventTemplatesHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const templates = await listEventTemplates();
    res.status(200).json({ templates });
  } catch (error) {
    handleEventTemplateError(error, res, next);
  }
}

export async function createEventTemplateHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const template = await createEventTemplate(req.body);
    res.status(201).json({ template });
  } catch (error) {
    handleEventTemplateError(error, res, next);
  }
}

export async function getEventTemplateByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const template = await getEventTemplateById(req.params.id);
    res.status(200).json({ template });
  } catch (error) {
    handleEventTemplateError(error, res, next);
  }
}

export async function updateEventTemplateHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const template = await updateEventTemplate(req.params.id, req.body);
    res.status(200).json({ template });
  } catch (error) {
    handleEventTemplateError(error, res, next);
  }
}

export async function deleteEventTemplateHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await deleteEventTemplate(req.params.id);
    res.status(200).json({ success: true });
  } catch (error) {
    handleEventTemplateError(error, res, next);
  }
}

export async function applyTemplateToEventHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const event = await applyTemplateToEvent(req.params.id, req.body);
    res.status(201).json({ event });
  } catch (error) {
    handleEventTemplateError(error, res, next);
  }
}

function handleEventTemplateError(
  error: unknown,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof EventTemplateServiceError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  next(error);
}
