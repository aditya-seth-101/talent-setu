import { Router } from "express";
import { authenticate } from "../middleware/auth/authenticate.js";
import { requireRoles } from "../middleware/rbac.js";
import {
  requestCourseOutline,
  listCourseOutlines,
  getCourseOutline,
  updateCourseOutlineReview,
} from "../controllers/course-outline.controller.js";

export const courseRouter = Router();

courseRouter.use(authenticate, requireRoles(["admin"]));

courseRouter.post("/outlines", requestCourseOutline);
courseRouter.get("/outlines", listCourseOutlines);
courseRouter.get("/outlines/:id", getCourseOutline);
courseRouter.patch("/outlines/:id/status", updateCourseOutlineReview);
