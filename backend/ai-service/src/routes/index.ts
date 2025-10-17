import { Router } from "express";
import { promptRouter } from "./prompt.js";
import { learningRouter } from "./learning.js";
import { assessmentsRouter } from "./assessments.js";

export const router = Router();

router.use("/prompts", promptRouter);
router.use("/learning", learningRouter);
router.use("/assessments", assessmentsRouter);
