import { Router } from "express";
import { authenticate } from "../middleware/auth/authenticate.js";
import { requireRoles } from "../middleware/rbac.js";
import {
  listCourses,
  getCourse,
  getTopic,
} from "../controllers/course.controller.js";
import {
  requestCourseOutline,
  listCourseOutlines,
  getCourseOutline,
  updateCourseOutlineReview,
  publishCourseOutline,
} from "../controllers/course-outline.controller.js";

export const courseRouter = Router();

courseRouter.get("/", authenticate, listCourses);
courseRouter.get("/:courseId", authenticate, getCourse);
courseRouter.get("/:courseId/topics/:topicId", authenticate, getTopic);

const adminRouter = Router();

adminRouter.post("/", requestCourseOutline);
adminRouter.get("/", listCourseOutlines);
adminRouter.get("/:id", getCourseOutline);
adminRouter.patch("/:id/status", updateCourseOutlineReview);
adminRouter.post("/:id/publish", publishCourseOutline);

courseRouter.use(
  "/outlines",
  authenticate,
  requireRoles(["admin"]),
  adminRouter
);
