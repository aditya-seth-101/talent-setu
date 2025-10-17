import type {
  Collection,
  Filter,
  OptionalUnlessRequiredId,
  WithId,
} from "mongodb";
import { ObjectId } from "mongodb";
import {
  type AssessmentDocument,
  type AssessmentStatus,
  type CreateAssessmentInput,
  type UpdateAssessmentInput,
} from "../models/assessment.model.js";
import { getCollection } from "../services/database.js";

function assessmentsCollection(): Collection<AssessmentDocument> {
  return getCollection<AssessmentDocument>("assessments");
}

export async function createAssessment(
  input: CreateAssessmentInput
): Promise<AssessmentDocument> {
  const now = new Date();
  const doc: Omit<AssessmentDocument, "_id"> = {
    templateId: input.templateId,
    recruiterId: input.recruiterId,
    candidateId: input.candidateId,
    techStack: input.techStack,
    durationMinutes: input.durationMinutes,
    status: input.status ?? "scheduled",
    uniqueSeed: input.uniqueSeed,
    kioskFlag: input.kioskFlag ?? false,
    phases: input.phases,
    candidateSnapshot: input.candidateSnapshot,
    createdAt: now,
    updatedAt: now,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
  };

  const result = await assessmentsCollection().insertOne(
    doc as OptionalUnlessRequiredId<AssessmentDocument>
  );

  return {
    _id: result.insertedId,
    ...doc,
  };
}

export async function findAssessmentById(
  id: string | ObjectId
): Promise<AssessmentDocument | null> {
  const objectId = typeof id === "string" ? new ObjectId(id) : id;
  return assessmentsCollection().findOne({ _id: objectId });
}

export async function updateAssessmentById(
  id: ObjectId,
  update: UpdateAssessmentInput
): Promise<WithId<AssessmentDocument> | null> {
  const sanitized = sanitizeAssessmentUpdate(update);

  if (Object.keys(sanitized).length === 0) {
    return assessmentsCollection().findOne({ _id: id });
  }

  sanitized.updatedAt = new Date();

  const result = await assessmentsCollection().findOneAndUpdate(
    { _id: id },
    { $set: sanitized },
    { returnDocument: "after" }
  );

  return result ?? null;
}

export async function listAssessments(
  filter: {
    candidateId?: ObjectId;
    recruiterId?: ObjectId;
    status?: AssessmentStatus;
  } = {}
): Promise<AssessmentDocument[]> {
  const query: Filter<AssessmentDocument> = {};

  if (filter.candidateId) {
    query.candidateId = filter.candidateId;
  }

  if (filter.recruiterId) {
    query.recruiterId = filter.recruiterId;
  }

  if (filter.status) {
    query.status = filter.status;
  }

  return assessmentsCollection().find(query).sort({ updatedAt: -1 }).toArray();
}

function sanitizeAssessmentUpdate(
  update: UpdateAssessmentInput
): Partial<AssessmentDocument & { updatedAt: Date }> {
  const sanitized: Partial<AssessmentDocument & { updatedAt: Date }> = {};

  if (update.status !== undefined) {
    sanitized.status = update.status;
  }

  if (update.phases !== undefined) {
    sanitized.phases = update.phases ?? [];
  }

  if (update.kioskFlag !== undefined) {
    sanitized.kioskFlag = update.kioskFlag;
  }

  if (update.startedAt !== undefined) {
    sanitized.startedAt = update.startedAt ?? undefined;
  }

  if (update.completedAt !== undefined) {
    sanitized.completedAt = update.completedAt ?? undefined;
  }

  if (update.durationMinutes !== undefined) {
    sanitized.durationMinutes = update.durationMinutes;
  }

  return sanitized;
}
