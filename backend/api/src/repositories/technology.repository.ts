import { ObjectId } from "mongodb";
import type { Collection, Filter, WithId } from "mongodb";
import type {
  TechnologyDocument,
  TechnologyStatus,
} from "../models/technology.model.js";
import { getCollection } from "../services/database.js";

function technologiesCollection(): Collection<TechnologyDocument> {
  return getCollection<TechnologyDocument>("technologies");
}

export interface CreateTechnologyInput {
  name: string;
  slug: string;
  judge0LanguageKey: string;
  judge0LanguageId?: number | null;
  aliases?: string[];
  levels?: string[];
  status?: TechnologyStatus;
  createdBy?: ObjectId | null;
  approvedBy?: ObjectId | null;
}

export async function findTechnologyBySlug(
  slug: string
): Promise<TechnologyDocument | null> {
  return technologiesCollection().findOne({ slug });
}

export async function findTechnologyById(
  id: string | ObjectId
): Promise<TechnologyDocument | null> {
  const objectId = typeof id === "string" ? new ObjectId(id) : id;
  return technologiesCollection().findOne({ _id: objectId });
}

export async function findTechnologiesByIds(
  ids: Array<string | ObjectId>
): Promise<TechnologyDocument[]> {
  if (!ids.length) {
    return [];
  }

  const objectIds = ids.map((value) =>
    typeof value === "string" ? new ObjectId(value) : value
  );

  return technologiesCollection()
    .find({ _id: { $in: objectIds } })
    .toArray();
}

export async function findTechnologyByLanguageKey(
  key: string
): Promise<TechnologyDocument | null> {
  return technologiesCollection().findOne({ judge0_language_key: key });
}

export async function searchTechnologies(
  query: string | undefined,
  limit = 20
): Promise<TechnologyDocument[]> {
  const filter: Filter<TechnologyDocument> = {
    status: { $ne: "deprecated" },
  };

  if (query && query.trim().length > 0) {
    const pattern = new RegExp(
      query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i"
    );
    filter.$or = [{ name: pattern }, { aliases: { $regex: pattern } }];
  }

  return technologiesCollection()
    .find(filter)
    .sort({ name: 1 })
    .limit(limit)
    .toArray();
}

export async function createTechnology(
  input: CreateTechnologyInput
): Promise<TechnologyDocument> {
  const now = new Date();
  const document: TechnologyDocument = {
    _id: new ObjectId(),
    name: input.name,
    slug: input.slug,
    judge0_language_key: input.judge0LanguageKey,
    judge0_language_id: input.judge0LanguageId ?? undefined,
    aliases: input.aliases ?? [],
    levels: input.levels ?? [],
    status: input.status ?? "active",
    createdBy: input.createdBy ?? null,
    approvedBy: input.approvedBy ?? null,
    approvedAt: input.approvedBy ? now : null,
    createdAt: now,
    updatedAt: now,
  };

  await technologiesCollection().insertOne(document);
  return document;
}

export async function addAliasesToTechnology(
  technologyId: ObjectId,
  aliases: string[]
): Promise<WithId<TechnologyDocument> | null> {
  if (!aliases.length) {
    return technologiesCollection().findOne({ _id: technologyId });
  }

  await technologiesCollection().updateOne(
    { _id: technologyId },
    {
      $set: { updatedAt: new Date() },
      $addToSet: { aliases: { $each: aliases } },
    }
  );

  return technologiesCollection().findOne({ _id: technologyId });
}

export async function findTechnologiesBySlugOrAlias(
  slug: string
): Promise<TechnologyDocument[]> {
  const pattern = new RegExp(`^${slug}$`, "i");
  return technologiesCollection()
    .find({
      $or: [{ slug: pattern }, { aliases: { $regex: pattern } }],
    })
    .toArray();
}
