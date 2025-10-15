import { ObjectId } from "mongodb";
import type { Collection } from "mongodb";
import type { TechnologyDocument } from "../models/technology.model.js";
import { getCollection } from "../services/database.js";

function technologiesCollection(): Collection<TechnologyDocument> {
  return getCollection<TechnologyDocument>("technologies");
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

export async function findTechnologyByLanguageKey(
  key: string
): Promise<TechnologyDocument | null> {
  return technologiesCollection().findOne({ judge0_language_key: key });
}
