import type { Collection, OptionalUnlessRequiredId } from "mongodb";
import { ObjectId } from "mongodb";
import type {
  ChallengeDocument,
  CreateChallengeInput,
  UpdateChallengeInput,
} from "../models/challenge.model.js";
import { getCollection } from "../services/database.js";

function challengesCollection(): Collection<ChallengeDocument> {
  return getCollection<ChallengeDocument>("challenges");
}

export async function createChallenge(
  input: CreateChallengeInput
): Promise<ChallengeDocument> {
  const now = new Date();
  const doc: Omit<ChallengeDocument, "_id"> = {
    topicId: input.topicId,
    type: input.type,
    difficulty: input.difficulty,
    prompt: input.prompt,
    judge0Spec: input.judge0Spec,
    mcq: input.mcq,
    debugContext: input.debugContext,
    hints: input.hints ?? [],
    solutionHash: input.solutionHash,
    randomizeSeed: input.randomizeSeed,
    createdAt: now,
    updatedAt: now,
  };

  const result = await challengesCollection().insertOne(
    doc as OptionalUnlessRequiredId<ChallengeDocument>
  );

  return {
    _id: result.insertedId,
    ...doc,
  };
}

export async function findChallengesByTopicId(
  topicId: ObjectId
): Promise<ChallengeDocument[]> {
  return challengesCollection()
    .find({ topicId })
    .sort({ createdAt: 1 })
    .toArray();
}

export async function findChallengesByTopicIds(
  topicIds: ObjectId[]
): Promise<Record<string, ChallengeDocument[]>> {
  if (topicIds.length === 0) {
    return {};
  }

  const result: Record<string, ChallengeDocument[]> = {};

  const cursor = challengesCollection().find({
    topicId: { $in: topicIds },
  });

  await cursor.forEach((challenge) => {
    const key = challenge.topicId.toHexString();
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(challenge);
  });

  return result;
}

export async function findChallengeById(
  id: string | ObjectId
): Promise<ChallengeDocument | null> {
  const objectId = typeof id === "string" ? new ObjectId(id) : id;
  return challengesCollection().findOne({ _id: objectId });
}

export async function updateChallengeById(
  id: ObjectId,
  update: UpdateChallengeInput
): Promise<ChallengeDocument | null> {
  const $set: Partial<ChallengeDocument> = {
    updatedAt: new Date(),
  };

  if (update.prompt !== undefined) {
    $set.prompt = update.prompt;
  }

  if (update.judge0Spec !== undefined) {
    $set.judge0Spec = update.judge0Spec ?? undefined;
  }

  if (update.mcq !== undefined) {
    $set.mcq = update.mcq ?? undefined;
  }

  if (update.debugContext !== undefined) {
    $set.debugContext = update.debugContext ?? undefined;
  }

  if (update.hints !== undefined) {
    $set.hints = update.hints;
  }

  if (update.solutionHash !== undefined) {
    $set.solutionHash = update.solutionHash ?? undefined;
  }

  if (update.randomizeSeed !== undefined) {
    $set.randomizeSeed = update.randomizeSeed ?? undefined;
  }

  const result = await challengesCollection().findOneAndUpdate(
    { _id: id },
    { $set },
    { returnDocument: "after" }
  );

  return result ?? null;
}
