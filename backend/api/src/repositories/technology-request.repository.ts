import { ObjectId } from "mongodb";
import type { Collection, Filter, FindOptions, WithId } from "mongodb";
import type {
  TechnologyRequestDocument,
  TechnologyRequestStatus,
} from "../models/technology-request.model.js";
import { getCollection } from "../services/database.js";

function technologyRequestsCollection(): Collection<TechnologyRequestDocument> {
  return getCollection<TechnologyRequestDocument>("technology_requests");
}

export interface CreateTechnologyRequestInput {
  name: string;
  slug: string;
  description?: string | null;
  aliases?: string[];
  requestedBy: ObjectId;
  candidateTechnologyIds?: ObjectId[];
}

export async function createTechnologyRequest(
  input: CreateTechnologyRequestInput
): Promise<TechnologyRequestDocument> {
  const now = new Date();
  const document: TechnologyRequestDocument = {
    _id: new ObjectId(),
    name: input.name,
    slug: input.slug,
    description: input.description ?? null,
    aliases: input.aliases ?? [],
    status: "pending",
    requestedBy: input.requestedBy,
    reviewerId: null,
    reviewerNotes: null,
    mappedTechnologyId: null,
    createdTechnologyId: null,
    candidateTechnologyIds: input.candidateTechnologyIds ?? [],
    createdAt: now,
    updatedAt: now,
  };

  await technologyRequestsCollection().insertOne(document);
  return document;
}

export async function findTechnologyRequestById(
  id: string | ObjectId
): Promise<TechnologyRequestDocument | null> {
  const objectId = typeof id === "string" ? new ObjectId(id) : id;
  return technologyRequestsCollection().findOne({ _id: objectId });
}

export interface ListTechnologyRequestsParams {
  status?: TechnologyRequestStatus;
  limit?: number;
  page?: number;
}

export async function listTechnologyRequests({
  status,
  limit = 50,
  page = 1,
}: ListTechnologyRequestsParams): Promise<{
  items: TechnologyRequestDocument[];
  total: number;
}> {
  const filter: Filter<TechnologyRequestDocument> = {};
  if (status) {
    filter.status = status;
  }

  const options: FindOptions<TechnologyRequestDocument> = {
    sort: { createdAt: -1 },
    skip: (page - 1) * limit,
    limit,
  };

  const [items, total] = await Promise.all([
    technologyRequestsCollection().find(filter, options).toArray(),
    technologyRequestsCollection().countDocuments(filter),
  ]);

  return { items, total };
}

export interface UpdateTechnologyRequestInput {
  status?: TechnologyRequestStatus;
  reviewerId?: ObjectId | null;
  reviewerNotes?: string | null;
  mappedTechnologyId?: ObjectId | null;
  createdTechnologyId?: ObjectId | null;
}

export async function updateTechnologyRequest(
  id: ObjectId,
  update: UpdateTechnologyRequestInput
): Promise<WithId<TechnologyRequestDocument> | null> {
  const updateSet: Partial<TechnologyRequestDocument> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };

  if (update.status) {
    updateSet.status = update.status;
  }

  if ("reviewerId" in update) {
    updateSet.reviewerId = update.reviewerId ?? null;
  }

  if ("reviewerNotes" in update) {
    updateSet.reviewerNotes = update.reviewerNotes ?? null;
  }

  if ("mappedTechnologyId" in update) {
    updateSet.mappedTechnologyId = update.mappedTechnologyId ?? null;
  }

  if ("createdTechnologyId" in update) {
    updateSet.createdTechnologyId = update.createdTechnologyId ?? null;
  }

  await technologyRequestsCollection().updateOne(
    { _id: id },
    { $set: updateSet }
  );

  return technologyRequestsCollection().findOne({ _id: id });
}

export async function findLatestPendingRequestBySlug(
  slug: string
): Promise<TechnologyRequestDocument | null> {
  return technologyRequestsCollection().findOne(
    { slug, status: "pending" },
    { sort: { createdAt: -1 } }
  );
}
