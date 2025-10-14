import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import * as judgeService from "../services/judge/judge.service.js";

const submissionSchema = z.object({
  sourceCode: z.string().min(1, "sourceCode is required"),
  languageId: z.number().int().positive(),
  stdin: z.string().optional(),
  expectedOutput: z.string().optional(),
  challengeId: z.string().optional(),
});

const paramsSchema = z.object({
  attemptId: z.string().min(1),
});

const callbackSchema = z
  .object({
    token: z.string().min(1),
  })
  .passthrough();

export async function createSubmission(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = submissionSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const attempt = await judgeService.submitAttempt({
      userId,
      challengeId: body.challengeId,
      languageId: body.languageId,
      sourceCode: body.sourceCode,
      stdin: body.stdin,
      expectedOutput: body.expectedOutput,
    });

    res.status(202).json({ attempt });
  } catch (error) {
    next(error);
  }
}

export async function getSubmission(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { attemptId } = paramsSchema.parse(req.params);
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const attempt = await judgeService.getAttemptForUser(attemptId, userId);
    res.status(200).json({ attempt });
  } catch (error) {
    next(error);
  }
}

export async function handleCallback(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (env.JUDGE_CALLBACK_SECRET) {
      const querySchema = z.object({
        secret: z.string().optional(),
      });
      const { secret } = querySchema.parse(req.query);
      if (secret !== env.JUDGE_CALLBACK_SECRET) {
        res.status(401).json({ message: "Invalid callback secret" });
        return;
      }
    }

    const payload = callbackSchema.parse(req.body);
    await judgeService.handleJudgeCallback(payload);
    res.status(202).json({ received: true });
  } catch (error) {
    next(error);
  }
}
