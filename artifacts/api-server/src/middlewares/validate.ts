import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { createError } from "../lib/errors";

export function validate(schema: z.ZodTypeAny, source: "body" | "query" | "params" = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.flatten();
      res.status(400).json(
        createError("VALIDATION_ERROR", "Invalid request data", details as unknown as object),
      );
      return;
    }
    req[source] = result.data;
    next();
  };
}
