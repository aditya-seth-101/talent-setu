import { Router } from "express";
import { healthRouter } from "./health.js";
import { authRouter } from "./auth.js";
import { judgeRouter } from "./judge.js";
import { profileRouter } from "./profile.js";
import { courseRouter } from "./course.js";

export const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/judge", judgeRouter);
router.use("/profiles", profileRouter);
router.use("/courses", courseRouter);
