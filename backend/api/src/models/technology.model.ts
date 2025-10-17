import type { ObjectId } from "mongodb";

export type TechnologyStatus = "active" | "deprecated";

export interface TechnologyDocument {
  _id: ObjectId;
  name: string;
  slug: string;
  judge0_language_key: string;
  judge0_language_id?: number;
  aliases: string[];
  levels: string[];
  status?: TechnologyStatus;
  createdBy?: ObjectId | null;
  approvedBy?: ObjectId | null;
  approvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
