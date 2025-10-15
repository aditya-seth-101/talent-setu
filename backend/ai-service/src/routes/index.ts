import { Router } from "express";
import { promptRouter } from "./prompt.js";
import { learningRouter } from "./learning.js";

export const router = Router();

router.use("/prompts", promptRouter);
router.use("/learning", learningRouter);
