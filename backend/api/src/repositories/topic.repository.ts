import type { Collection, Filter, OptionalUnlessRequiredId } from "mongodb";
import { ObjectId } from "mongodb";
import type {
  CreateTopicInput,
  TopicDocument,
  UpdateTopicInput,
} from "../models/topic.model.js";
import { getCollection } from "../services/database.js";

function topicsCollection(): Collection<TopicDocument> {
  return getCollection<TopicDocument>("topics");
}

export async function createTopic(
  input: CreateTopicInput
): Promise<TopicDocument> {
  const now = new Date();
  const doc: Omit<TopicDocument, "_id"> = {
    courseId: input.courseId,
    title: input.title,
    slug: input.slug,
    description: input.description,
    youtubeLink: input.youtubeLink,
    prerequisites: input.prerequisites ?? [],
    level: input.level,
    editorTemplate: input.editorTemplate,
    challengeIds: input.challengeIds ?? [],
    createdAt: now,
    updatedAt: now,
  };

  const result = await topicsCollection().insertOne(
    doc as OptionalUnlessRequiredId<TopicDocument>
  );

  return {
    _id: result.insertedId,
    ...doc,
  };
}

export async function findTopicsByCourseId(
  courseId: ObjectId
): Promise<TopicDocument[]> {
  return topicsCollection()
    .find({ courseId })
    .sort({ level: 1, title: 1 })
    .toArray();
}

export async function findTopicsByCourseIds(
  courseIds: ObjectId[]
): Promise<Record<string, TopicDocument[]>> {
  if (courseIds.length === 0) {
    return {};
  }

  const cursor = topicsCollection().find({
    courseId: { $in: courseIds },
  });

  const result: Record<string, TopicDocument[]> = {};
  await cursor.forEach((topic) => {
    const key = topic.courseId.toHexString();
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(topic);
  });

  for (const key of Object.keys(result)) {
    result[key].sort((a, b) => a.title.localeCompare(b.title));
  }

  return result;
}

export async function findTopicById(
  id: string | ObjectId
): Promise<TopicDocument | null> {
  const objectId = typeof id === "string" ? new ObjectId(id) : id;
  return topicsCollection().findOne({ _id: objectId });
}

export async function updateTopicById(
  id: ObjectId,
  update: UpdateTopicInput
): Promise<TopicDocument | null> {
  const $set: Partial<TopicDocument> = {
    updatedAt: new Date(),
  };

  if (update.title !== undefined) {
    $set.title = update.title;
  }

  if (update.description !== undefined) {
    $set.description = update.description;
  }

  if (update.youtubeLink !== undefined) {
    $set.youtubeLink = update.youtubeLink ?? undefined;
  }

  if (update.prerequisites !== undefined) {
    $set.prerequisites = update.prerequisites;
  }

  if (update.level !== undefined) {
    $set.level = update.level;
  }

  if (update.editorTemplate !== undefined) {
    $set.editorTemplate = update.editorTemplate ?? undefined;
  }

  if (update.challengeIds !== undefined) {
    $set.challengeIds = update.challengeIds;
  }

  const result = await topicsCollection().findOneAndUpdate(
    { _id: id },
    { $set },
    { returnDocument: "after" }
  );

  return result ?? null;
}

export async function findTopicsByIds(
  ids: ObjectId[]
): Promise<TopicDocument[]> {
  if (ids.length === 0) return [];
  const filter: Filter<TopicDocument> = {
    _id: { $in: ids },
  };

  return topicsCollection().find(filter).toArray();
}
