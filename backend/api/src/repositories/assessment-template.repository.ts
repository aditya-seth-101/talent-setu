import type {
  Collection,
  Filter,
  OptionalUnlessRequiredId,
  WithId,
} from "mongodb";
import { ObjectId } from "mongodb";
import {
  type AssessmentTemplateDocument,
  type AssessmentTemplateStatus,
  type CreateAssessmentTemplateInput,
  type UpdateAssessmentTemplateInput,
} from "../models/assessment-template.model.js";
import { getCollection } from "../services/database.js";

function assessmentTemplatesCollection(): Collection<AssessmentTemplateDocument> {
  return getCollection<AssessmentTemplateDocument>("assessment_templates");
}

export async function createTemplate(
  input: CreateAssessmentTemplateInput
): Promise<AssessmentTemplateDocument> {
  const now = new Date();
  const doc: Omit<AssessmentTemplateDocument, "_id"> = {
    name: input.name,
    description: input.description,
    createdBy: input.createdBy,
    techStack: input.techStack,
    durationMinutes: input.durationMinutes,
    phases: input.phases,
    status: input.status ?? "draft",
    createdAt: now,
    updatedAt: now,
    publishedAt: input.publishedAt,
  };

  const result = await assessmentTemplatesCollection().insertOne(
    doc as OptionalUnlessRequiredId<AssessmentTemplateDocument>
  );

  return {
    _id: result.insertedId,
    ...doc,
  };
}

export async function findTemplateById(
  id: string | ObjectId
): Promise<AssessmentTemplateDocument | null> {
  const objectId = typeof id === "string" ? new ObjectId(id) : id;
  return assessmentTemplatesCollection().findOne({ _id: objectId });
}

export async function findTemplatesByIds(
  ids: Array<string | ObjectId>
): Promise<AssessmentTemplateDocument[]> {
  if (ids.length === 0) {
    return [];
  }

  const objectIds = ids.map((value) =>
    typeof value === "string" ? new ObjectId(value) : value
  );

  return assessmentTemplatesCollection()
    .find({ _id: { $in: objectIds } })
    .toArray();
}

export async function updateTemplateById(
  id: ObjectId,
  update: UpdateAssessmentTemplateInput
): Promise<WithId<AssessmentTemplateDocument> | null> {
  const sanitized = sanitizeTemplateUpdate(update);

  if (Object.keys(sanitized).length === 0) {
    return assessmentTemplatesCollection().findOne({ _id: id });
  }

  sanitized.updatedAt = new Date();

  const result = await assessmentTemplatesCollection().findOneAndUpdate(
    { _id: id },
    { $set: sanitized },
    { returnDocument: "after" }
  );

  return result ?? null;
}

export async function listTemplates(
  filter: {
    status?: AssessmentTemplateStatus;
    createdBy?: ObjectId;
  } = {}
): Promise<AssessmentTemplateDocument[]> {
  const query: Filter<AssessmentTemplateDocument> = {};

  if (filter.status) {
    query.status = filter.status;
  }

  if (filter.createdBy) {
    query.createdBy = filter.createdBy;
  }

  return assessmentTemplatesCollection()
    .find(query)
    .sort({ updatedAt: -1 })
    .toArray();
}

function sanitizeTemplateUpdate(
  update: UpdateAssessmentTemplateInput
): Partial<AssessmentTemplateDocument & { updatedAt: Date }> {
  const sanitized: Partial<AssessmentTemplateDocument & { updatedAt: Date }> =
    {};

  if (update.name !== undefined) {
    sanitized.name = update.name;
  }

  if (update.description !== undefined) {
    sanitized.description = update.description ?? undefined;
  }

  if (update.techStack !== undefined) {
    sanitized.techStack = update.techStack ?? [];
  }

  if (update.durationMinutes !== undefined) {
    sanitized.durationMinutes = update.durationMinutes;
  }

  if (update.phases !== undefined) {
    sanitized.phases = update.phases ?? [];
  }

  if (update.status !== undefined) {
    sanitized.status = update.status;
  }

  if (update.publishedAt !== undefined) {
    sanitized.publishedAt = update.publishedAt ?? undefined;
  }

  return sanitized;
}
