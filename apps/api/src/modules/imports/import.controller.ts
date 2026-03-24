import type { NextFunction, Request, Response } from "express";
import {
  ImportServiceError,
  commitEventsImport,
  getImportJobById,
  listImportJobs,
  validateEventsImportFile
} from "./import.service";

export async function validateEventImportHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const uploadedFile = req.file;

    if (!uploadedFile) {
      throw new ImportServiceError(400, "CSV file is required.");
    }

    if (!req.user?.userId) {
      throw new ImportServiceError(401, "Authentication required.");
    }

    const result = await validateEventsImportFile({
      fileName: uploadedFile.originalname,
      fileBuffer: uploadedFile.buffer,
      createdByUserId: req.user.userId
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function commitEventImportHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await commitEventsImport(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function listImportJobsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await listImportJobs(req.query);
    res.status(200).json({
      data: result.jobs,
      meta: result.pagination,
      jobs: result.jobs,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
}

export async function getImportJobByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const job = await getImportJobById(req.params.id);
    res.status(200).json({ job });
  } catch (error) {
    next(error);
  }
}
