import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import {
  listTechnologyRequestQueue,
  requestNewTechnology,
  reviewTechnologyRequest,
  searchTechnologyDirectory,
} from "../services/technology/technology.service.js";

const requestIdParamsSchema = z.object({
  requestId: z.string().length(24, "Invalid request id"),
});

export async function searchTechnologyDirectoryHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await searchTechnologyDirectory(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function requestTechnologyHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await requestNewTechnology(req.body, req.user?.id);
    const status = result.duplicate ? 200 : 201;
    res.status(status).json(result);
  } catch (error) {
    next(error);
  }
}

export async function listTechnologyRequestsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const queue = await listTechnologyRequestQueue(req.query);
    res.status(200).json(queue);
  } catch (error) {
    next(error);
  }
}

export async function reviewTechnologyRequestHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { requestId } = requestIdParamsSchema.parse(req.params);
    const result = await reviewTechnologyRequest(
      requestId,
      req.body,
      req.user?.id
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
