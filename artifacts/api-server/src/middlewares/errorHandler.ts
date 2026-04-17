import type { Request, Response, NextFunction } from "express";
import { AppError, createError } from "../lib/errors";
import { logger } from "../lib/logger";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(createError(err.code, err.message, err.details));
    return;
  }

  logger.error({ err, method: req.method, url: req.url }, "Unhandled error");

  res.status(500).json(
    createError("SERVER_ERROR", "An unexpected error occurred"),
  );
}
