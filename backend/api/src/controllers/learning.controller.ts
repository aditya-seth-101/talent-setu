import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import {
  getCourseLearningView,
  getTopicLearningView,
  recordTopicGateResult,
  requestHintForChallenge,
} from "../services/learning/progress.service.js";
import { getLeaderboard } from "../services/learning/leaderboard.service.js";

const courseParamsSchema = z.object({
  courseId: z.string().length(24, "Invalid course id"),
});

const topicParamsSchema = courseParamsSchema.extend({
  topicId: z.string().length(24, "Invalid topic id"),
});

const completeTopicSchema = z
  .object({
    gateChallengeId: z.string().length(24).optional(),
    attemptId: z.string().length(24).optional(),
    passed: z.boolean(),
    score: z.number().min(0).max(100).optional(),
  })
  .strict();

const hintParamsSchema = z.object({
  challengeId: z.string().length(24, "Invalid challenge id"),
});

const hintBodySchema = z
  .object({
    attemptId: z.string().length(24).optional(),
    code: z.string().trim().max(12000).optional(),
    stdout: z.string().trim().max(6000).optional(),
    stderr: z.string().trim().max(6000).optional(),
    message: z.string().trim().max(2000).optional(),
  })
  .strict();

const leaderboardQuerySchema = z
  .object({
    technologyId: z.string().length(24).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  })
  .strict();

export async function getCourseProgress(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { courseId } = courseParamsSchema.parse(req.params);
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const view = await getCourseLearningView(userId, courseId);
    res.status(200).json(view);
  } catch (error) {
    next(error);
  }
}

export async function getTopicProgress(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { courseId, topicId } = topicParamsSchema.parse(req.params);
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const view = await getTopicLearningView(userId, courseId, topicId);
    res.status(200).json(view);
  } catch (error) {
    next(error);
  }
}

export async function completeTopicGate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { topicId } = topicParamsSchema
      .pick({ topicId: true })
      .parse(req.params);
    const body = completeTopicSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const view = await recordTopicGateResult(userId, topicId, body);
    res.status(200).json(view);
  } catch (error) {
    next(error);
  }
}

export async function requestGateHint(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { challengeId } = hintParamsSchema.parse(req.params);
    const body = hintBodySchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const hint = await requestHintForChallenge(userId, challengeId, body);
    res.status(200).json(hint);
  } catch (error) {
    next(error);
  }
}

export async function learningLeaderboard(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const query = leaderboardQuerySchema.parse(req.query);
    const leaderboard = await getLeaderboard(query);
    res.status(200).json(leaderboard);
  } catch (error) {
    next(error);
  }
}
