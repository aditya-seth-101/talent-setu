import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import * as courseService from "../services/course/course.service.js";

const courseIdParamSchema = z.object({
  courseId: z.string().length(24, "Invalid course id"),
});

const topicParamsSchema = courseIdParamSchema.extend({
  topicId: z.string().length(24, "Invalid topic id"),
});

export async function listCourses(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await courseService.listPublishedCourses();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getCourse(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { courseId } = courseIdParamSchema.parse(req.params);
    const course = await courseService.getCourseDetail(courseId);
    res.status(200).json({ course });
  } catch (error) {
    next(error);
  }
}

export async function getTopic(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { courseId, topicId } = topicParamsSchema.parse(req.params);
    const result = await courseService.getTopicDetail(courseId, topicId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
