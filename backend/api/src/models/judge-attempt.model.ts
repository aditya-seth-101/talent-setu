import type { ObjectId } from "mongodb";

export type JudgeAttemptStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export interface JudgeAttemptDocument {
  _id: ObjectId;
  userId: ObjectId;
  challengeId?: string;
  languageId: number;
  sourceCode: string;
  stdin?: string;
  expectedOutput?: string;
  token?: string;
  status: JudgeAttemptStatus;
  result?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface CreateJudgeAttemptInput {
  userId: ObjectId;
  challengeId?: string;
  languageId: number;
  sourceCode: string;
  stdin?: string;
  expectedOutput?: string;
}

export type UpdateJudgeAttemptInput = Partial<
  Pick<
    JudgeAttemptDocument,
    "token" | "status" | "result" | "updatedAt" | "completedAt"
  >
>;

export interface PublicJudgeAttempt {
  id: string;
  userId: string;
  challengeId?: string;
  languageId: number;
  status: JudgeAttemptStatus;
  token?: string;
  result?: Record<string, unknown>;
  sourceCode: string;
  stdin?: string;
  expectedOutput?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export function mapJudgeAttemptToPublic(
  attempt: JudgeAttemptDocument
): PublicJudgeAttempt {
  return {
    id: attempt._id.toHexString(),
    userId: attempt.userId.toHexString(),
    challengeId: attempt.challengeId,
    languageId: attempt.languageId,
    status: attempt.status,
    token: attempt.token,
    result: attempt.result,
    sourceCode: attempt.sourceCode,
    stdin: attempt.stdin,
    expectedOutput: attempt.expectedOutput,
    createdAt: attempt.createdAt.toISOString(),
    updatedAt: attempt.updatedAt.toISOString(),
    completedAt: attempt.completedAt?.toISOString(),
  };
}
