import type { Collection, OptionalUnlessRequiredId, WithId } from "mongodb";
import { ObjectId } from "mongodb";
import type {
  CreateJudgeAttemptInput,
  JudgeAttemptDocument,
  UpdateJudgeAttemptInput,
} from "../models/judge-attempt.model.js";
import { getCollection } from "../services/database.js";

function judgeAttemptsCollection(): Collection<JudgeAttemptDocument> {
  return getCollection<JudgeAttemptDocument>("judge_attempts");
}

export async function createAttempt(
  input: CreateJudgeAttemptInput
): Promise<JudgeAttemptDocument> {
  const now = new Date();
  const doc: Omit<JudgeAttemptDocument, "_id"> = {
    userId: input.userId,
    challengeId: input.challengeId,
    languageId: input.languageId,
    sourceCode: input.sourceCode,
    stdin: input.stdin,
    expectedOutput: input.expectedOutput,
    status: "queued",
    createdAt: now,
    updatedAt: now,
  };

  const result = await judgeAttemptsCollection().insertOne(
    doc as OptionalUnlessRequiredId<JudgeAttemptDocument>
  );

  return {
    _id: result.insertedId,
    ...doc,
  };
}

export async function updateAttempt(
  id: ObjectId,
  update: UpdateJudgeAttemptInput
): Promise<void> {
  const sanitized = sanitizeUpdate(update);
  if (Object.keys(sanitized).length === 0) return;

  await judgeAttemptsCollection().updateOne(
    { _id: id },
    {
      $set: sanitized,
    }
  );
}

export async function findAttemptById(
  id: string | ObjectId
): Promise<JudgeAttemptDocument | null> {
  const objectId = typeof id === "string" ? new ObjectId(id) : id;
  return judgeAttemptsCollection().findOne({ _id: objectId });
}

export async function findAttemptByToken(
  token: string
): Promise<JudgeAttemptDocument | null> {
  return judgeAttemptsCollection().findOne({ token });
}

export async function updateAttemptByToken(
  token: string,
  update: UpdateJudgeAttemptInput
): Promise<WithId<JudgeAttemptDocument> | null> {
  const sanitized = sanitizeUpdate(update);
  if (Object.keys(sanitized).length === 0) {
    return judgeAttemptsCollection().findOne({ token });
  }

  const result = await judgeAttemptsCollection().findOneAndUpdate(
    { token },
    { $set: sanitized },
    { returnDocument: "after" }
  );

  return result ?? null;
}

function sanitizeUpdate(update: UpdateJudgeAttemptInput) {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(update)) {
    if (value !== undefined) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
