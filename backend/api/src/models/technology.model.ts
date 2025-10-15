import type { ObjectId } from "mongodb";

export interface TechnologyDocument {
  _id: ObjectId;
  name: string;
  slug: string;
  judge0_language_key: string;
  judge0_language_id?: number;
  aliases: string[];
  levels: string[];
  createdAt: Date;
  updatedAt: Date;
}
