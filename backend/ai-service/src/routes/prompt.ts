import { Router } from "express";
import { z } from "zod";
import { generateCourseOutline } from "../services/course-generator.js";

export const promptRouter = Router();

const courseRequestSchema = z.object({
  technology: z.string().min(1),
  level: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  seed: z.string().optional(),
  forceRefresh: z.boolean().optional(),
});

promptRouter.post("/course-outline", async (req, res, next) => {
  try {
    const payload = courseRequestSchema.parse(req.body);
    const result = await generateCourseOutline(payload);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});
