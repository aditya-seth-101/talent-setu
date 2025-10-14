import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../config/logger.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Keep `_next` referenced to satisfy eslint no-unused-vars when argsIgnorePattern isn't applied
  void _next;
  logger.error({ err }, "AI service error");

  if (err instanceof ZodError) {
    res
      .status(400)
      .json({ message: "Validation failed", details: err.flatten() });
    return;
  }

  if (err instanceof Error) {
    res.status(500).json({ message: err.message });
    return;
  }

  res.status(500).json({ message: "Unexpected error" });
}
