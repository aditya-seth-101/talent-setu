import type { ObjectId } from "mongodb";

export interface EmailVerificationDocument {
  _id: ObjectId;
  userId: ObjectId;
  email: string;
  tokenHash: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  usedAt?: Date;
}
