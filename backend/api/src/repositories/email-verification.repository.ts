import { ObjectId } from "mongodb";
import { getCollection } from "../services/database.js";
import type { EmailVerificationDocument } from "../models/email-verification.model.js";

function emailVerificationCollection() {
  return getCollection<EmailVerificationDocument>("email_verifications");
}

export async function createEmailVerification(input: {
  _id?: ObjectId;
  userId: ObjectId;
  email: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<EmailVerificationDocument> {
  const now = new Date();
  const doc: EmailVerificationDocument = {
    _id: input._id ?? new ObjectId(),
    userId: input.userId,
    email: input.email,
    tokenHash: input.tokenHash,
    expiresAt: input.expiresAt,
    createdAt: now,
    updatedAt: now,
  };

  await emailVerificationCollection().insertOne(doc);
  return doc;
}

export async function findEmailVerificationById(id: string | ObjectId) {
  const objectId = typeof id === "string" ? new ObjectId(id) : id;
  return emailVerificationCollection().findOne({ _id: objectId });
}

export async function markVerificationUsed(id: ObjectId) {
  await emailVerificationCollection().updateOne(
    { _id: id },
    { $set: { usedAt: new Date(), updatedAt: new Date() } }
  );
}

export async function deleteVerificationsForUser(userId: ObjectId) {
  await emailVerificationCollection().deleteMany({ userId });
}
