import type { ErrorRequestHandler } from "express";
import { MulterError } from "multer";
import { ZodError } from "zod";
import { AppError, isStatusError } from "../errors/AppError";
import { logError } from "../utils/logger";

const isProduction = process.env.NODE_ENV === "production";

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const requestId = req.requestId;

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    (error as { message?: string }).message === "Origin is not allowed by CORS policy."
  ) {
    res.status(403).json({
      message: "Request origin is not allowed.",
      code: "CORS_FORBIDDEN",
      requestId
    });
    return;
  }

  if (error instanceof MulterError) {
    const isFileTooLarge = error.code === "LIMIT_FILE_SIZE";
    res.status(isFileTooLarge ? 413 : 400).json({
      message: isFileTooLarge ? "Uploaded file exceeds allowed size." : error.message,
      code: "UPLOAD_ERROR",
      requestId
    });
    return;
  }

  if (error instanceof ZodError) {
    const validationError = new AppError({
      statusCode: 400,
      message: error.issues[0]?.message ?? "Validation failed.",
      code: "VALIDATION_ERROR",
      details: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code
      }))
    });

    res.status(validationError.statusCode).json({
      message: validationError.message,
      code: validationError.code,
      details: validationError.details,
      requestId
    });
    return;
  }

  if (isStatusError(error)) {
    const normalizedError = new AppError({
      statusCode: error.statusCode,
      message: error.message,
      code: error.code ?? "REQUEST_FAILED",
      details: error.details
    });

    res.status(normalizedError.statusCode).json({
      message: normalizedError.message,
      code: normalizedError.code,
      details: normalizedError.details,
      requestId
    });
    return;
  }

  const appError =
    error instanceof AppError
      ? error
      : new AppError({
          statusCode: 500,
          message: "Internal server error",
          code: "INTERNAL_SERVER_ERROR",
          expose: false
        });

  logError("request.error", {
    requestId,
    path: req.originalUrl,
    method: req.method,
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: isProduction ? undefined : error.stack
          }
        : {
            message: "Unknown error"
          }
  });

  res.status(appError.statusCode).json({
    message: appError.expose ? appError.message : "Internal server error",
    code: appError.code,
    details: appError.expose ? appError.details : undefined,
    requestId
  });
};
