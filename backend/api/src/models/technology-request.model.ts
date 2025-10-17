import type { ObjectId } from "mongodb";

export type TechnologyRequestStatus = "pending" | "approved" | "rejected";

export interface TechnologyRequestDocument {
  _id: ObjectId;
  name: string;
  slug: string;
  description?: string | null;
  aliases: string[];
  status: TechnologyRequestStatus;
  requestedBy: ObjectId;
  reviewerId?: ObjectId | null;
  reviewerNotes?: string | null;
  mappedTechnologyId?: ObjectId | null;
  createdTechnologyId?: ObjectId | null;
  candidateTechnologyIds: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}
