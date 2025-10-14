import { Router } from "express";
import {
  createSubmission,
  getSubmission,
  handleCallback,
} from "../controllers/judge.controller.js";
import { authenticate } from "../middleware/auth/authenticate.js";

export const judgeRouter = Router();

judgeRouter.post("/submissions", authenticate, createSubmission);
judgeRouter.get("/submissions/:attemptId", authenticate, getSubmission);
judgeRouter.post("/callback", handleCallback);
