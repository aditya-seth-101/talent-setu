import { Router } from "express";
import { authenticate } from "../middleware/auth/authenticate.js";
import { requireRoles } from "../middleware/rbac.js";
import * as adminController from "../controllers/admin.course.controller.js";

export const adminCoursesRouter = Router();

adminCoursesRouter.use(authenticate, requireRoles(["admin"]));

adminCoursesRouter.post("/courses", adminController.createCourse);
adminCoursesRouter.post("/topics", adminController.createTopic);
adminCoursesRouter.post("/challenges", adminController.createChallenge);
