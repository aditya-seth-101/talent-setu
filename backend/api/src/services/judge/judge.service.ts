import { ObjectId } from "mongodb";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import {
  mapJudgeAttemptToPublic,
  type JudgeAttemptStatus,
  type UpdateJudgeAttemptInput,
  type PublicJudgeAttempt,
} from "../../models/judge-attempt.model.js";
import * as judgeAttemptRepository from "../../repositories/judge-attempt.repository.js";
import { BadRequestError, NotFoundError } from "../../utils/http-errors.js";

const JUDGE_SUBMISSION_ENDPOINT = `${env.JUDGE_SERVICE_URL.replace(
  /\/$/,
  ""
)}/judge/submissions`;

type SubmitAttemptInput = {
  userId: string;
  challengeId?: string;
  languageId: number;
  sourceCode: string;
  stdin?: string;
  expectedOutput?: string;
};

type JudgeCallbackPayload = {
  token: string;
  status?: {
    id: number;
    description: string;
  };
} & Record<string, unknown>;

export async function submitAttempt(
  input: SubmitAttemptInput
): Promise<PublicJudgeAttempt> {
  const userObjectId = parseObjectId(input.userId, "Invalid user identifier");

  const attempt = await judgeAttemptRepository.createAttempt({
    userId: userObjectId,
    challengeId: input.challengeId,
    languageId: input.languageId,
    sourceCode: input.sourceCode,
    stdin: input.stdin,
    expectedOutput: input.expectedOutput,
  });

  try {
    const response = await fetch(JUDGE_SUBMISSION_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_code: input.sourceCode,
        language_id: input.languageId,
        stdin: input.stdin,
        expected_output: input.expectedOutput,
      }),
    });

    if (!response.ok) {
      const errorBody = await safeReadBody(response);
      throw new Error(
        `Judge service responded with ${response.status}: ${errorBody}`
      );
    }

    const body = (await response.json()) as { token?: string };

    if (!body.token) {
      throw new Error("Judge service response did not include a token");
    }

    await judgeAttemptRepository.updateAttempt(attempt._id, {
      token: body.token,
      status: "queued",
      updatedAt: new Date(),
    });

    const persisted = await judgeAttemptRepository.findAttemptById(attempt._id);
    const hydrated = persisted ?? {
      ...attempt,
      token: body.token,
      updatedAt: new Date(),
    };

    return mapJudgeAttemptToPublic(hydrated);
  } catch (error) {
    logger.error({ err: error }, "Failed to submit attempt to judge service");
    await judgeAttemptRepository.updateAttempt(attempt._id, {
      status: "failed",
      result: { error: (error as Error).message },
      updatedAt: new Date(),
      completedAt: new Date(),
    });
    throw new BadRequestError("Unable to submit code for judging");
  }
}

export async function getAttemptForUser(
  attemptId: string,
  userId: string
): Promise<PublicJudgeAttempt> {
  const attemptObjectId = parseObjectId(
    attemptId,
    "Invalid attempt identifier"
  );
  const attempt = await judgeAttemptRepository.findAttemptById(attemptObjectId);

  if (!attempt) {
    throw new NotFoundError("Attempt not found");
  }

  const userObjectId = parseObjectId(userId, "Invalid user identifier");
  if (!attempt.userId.equals(userObjectId)) {
    throw new NotFoundError("Attempt not found");
  }

  return mapJudgeAttemptToPublic(attempt);
}

export async function handleJudgeCallback(
  payload: JudgeCallbackPayload
): Promise<void> {
  const token = payload.token;

  if (!token) {
    logger.warn({ payload }, "Received judge callback without token");
    return;
  }

  const statusId = payload.status?.id;
  const status = mapJudgeStatus(statusId);
  const now = new Date();
  const update: UpdateJudgeAttemptInput = {
    status,
    result: payload as Record<string, unknown>,
    updatedAt: now,
    completedAt:
      status === "completed" || status === "failed" ? now : undefined,
  };

  const updated = await judgeAttemptRepository.updateAttemptByToken(
    token,
    update
  );

  if (!updated) {
    logger.warn({ token }, "Received callback for unknown judge attempt");
  }
}

function mapJudgeStatus(statusId?: number): JudgeAttemptStatus {
  switch (statusId) {
    case 1:
      return "queued";
    case 2:
      return "processing";
    case 3:
      return "completed";
    default:
      return statusId ? "failed" : "processing";
  }
}

function parseObjectId(value: string, message: string): ObjectId {
  try {
    return new ObjectId(value);
  } catch {
    throw new BadRequestError(message);
  }
}

async function safeReadBody(response: globalThis.Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "<unavailable>";
  }
}
