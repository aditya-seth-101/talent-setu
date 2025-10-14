import { ObjectId } from "mongodb";
import { getCollection } from "../services/database.js";
import type { SessionDocument } from "../models/session.model.js";

function sessionsCollection() {
  return getCollection<SessionDocument>("sessions");
}

export async function createSession(session: {
  _id?: ObjectId;
  userId: ObjectId;
  tokenHash: string;
  userAgent?: string;
  ip?: string;
  expiresAt: Date;
}) {
  const now = new Date();
  const doc: SessionDocument = {
    _id: session._id ?? new ObjectId(),
    userId: session.userId,
    tokenHash: session.tokenHash,
    userAgent: session.userAgent,
    ip: session.ip,
    expiresAt: session.expiresAt,
    createdAt: now,
    updatedAt: now,
  };

  await sessionsCollection().insertOne(doc);
  return doc;
}

export async function updateSessionToken(
  sessionId: ObjectId,
  tokenHash: string,
  expiresAt: Date,
  metadata?: { userAgent?: string; ip?: string }
) {
  await sessionsCollection().updateOne(
    { _id: sessionId },
    {
      $set: {
        tokenHash,
        expiresAt,
        updatedAt: new Date(),
        ...(metadata?.userAgent !== undefined
          ? { userAgent: metadata.userAgent }
          : {}),
        ...(metadata?.ip !== undefined ? { ip: metadata.ip } : {}),
      },
      $unset: { revokedAt: "" },
    }
  );
}

export async function findActiveSessionById(
  sessionId: string | ObjectId
): Promise<SessionDocument | null> {
  const id =
    typeof sessionId === "string" ? new ObjectId(sessionId) : sessionId;
  return sessionsCollection().findOne({
    _id: id,
    revokedAt: { $exists: false },
  });
}

export async function revokeSession(sessionId: ObjectId) {
  await sessionsCollection().updateOne(
    { _id: sessionId },
    { $set: { revokedAt: new Date(), updatedAt: new Date() } }
  );
}

export async function revokeAllSessionsForUser(userId: ObjectId) {
  await sessionsCollection().updateMany(
    { userId },
    { $set: { revokedAt: new Date(), updatedAt: new Date() } }
  );
}
