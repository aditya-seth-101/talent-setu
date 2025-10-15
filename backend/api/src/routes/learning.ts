import { Router } from "express";
import { authenticate } from "../middleware/auth/authenticate.js";
import {
  completeTopicGate,
  getCourseProgress,
  getTopicProgress,
  learningLeaderboard,
  requestGateHint,
} from "../controllers/learning.controller.js";

export const learningRouter = Router();

learningRouter.get("/leaderboard", learningLeaderboard);

learningRouter.use(authenticate);

learningRouter.get("/courses/:courseId", getCourseProgress);
learningRouter.get("/courses/:courseId/topics/:topicId", getTopicProgress);
learningRouter.post("/topics/:topicId/complete", completeTopicGate);
learningRouter.post("/challenges/:challengeId/hints", requestGateHint);
