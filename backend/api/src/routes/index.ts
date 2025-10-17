import { Router } from "express";
import { healthRouter } from "./health.js";
import { authRouter } from "./auth.js";
import { judgeRouter } from "./judge.js";
import { profileRouter } from "./profile.js";
import { courseRouter } from "./course.js";
import { adminCoursesRouter } from "./admin.courses.js";
import { learningRouter } from "./learning.js";
import { assessmentRouter } from "./assessment.js";
import { recruitmentRouter } from "./recruitment.js";
import { technologyRouter } from "./technology.js";

export const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/judge", judgeRouter);
router.use("/profiles", profileRouter);
router.use("/courses", courseRouter);
router.use("/admin", adminCoursesRouter);
router.use("/learning", learningRouter);
router.use("/assessments", assessmentRouter);
router.use("/recruitment", recruitmentRouter);
router.use("/technology", technologyRouter);
