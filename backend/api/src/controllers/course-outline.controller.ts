import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import {
  generateCourseOutline,
  getCourseOutlineById,
  listCourseOutlineRequests,
  updateCourseOutlineReviewStatus,
  publishCourseOutline as publishCourseOutlineService,
} from "../services/course/course-outline.service.js";

const idParamSchema = z.object({
  id: z.string().length(24, "Invalid course outline id"),
});

export async function requestCourseOutline(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const outline = await generateCourseOutline(req.body, {
      id: user.id,
      email: user.email,
    });

    res.status(201).json({ outline });
  } catch (error) {
    next(error);
  }
}

export async function listCourseOutlines(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await listCourseOutlineRequests(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getCourseOutline(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const outline = await getCourseOutlineById(id);
    res.status(200).json({ outline });
  } catch (error) {
    next(error);
  }
}

export async function updateCourseOutlineReview(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { id } = idParamSchema.parse(req.params);
    const outline = await updateCourseOutlineReviewStatus(id, req.body, {
      id: user.id,
    });

    res.status(200).json({ outline });
  } catch (error) {
    next(error);
  }
}

export async function publishCourseOutline(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { id } = idParamSchema.parse(req.params);
    const result = await publishCourseOutlineService(id, { id: user.id });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}
