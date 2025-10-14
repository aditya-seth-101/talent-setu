import { Router } from "express";
import { submissionRouter } from "./submission.js";

export const router = Router();

router.use("/submissions", submissionRouter);
