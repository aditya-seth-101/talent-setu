import type { Db, Document } from "mongodb";
import { MongoClient } from "mongodb";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongo() {
  if (client && db) {
    return db;
  }

  client = new MongoClient(env.MONGODB_URI);
  await client.connect();
  db = client.db();

  await ensureIndexes(db);

  logger.info("Connected to MongoDB");
  return db;
}

export async function disconnectMongo() {
  if (!client) return;
  await client.close();
  client = null;
  db = null;
}

export function getDb(): Db {
  if (!db) {
    throw new Error("MongoDB not initialized. Call connectMongo() first.");
  }

  return db;
}

export function getCollection<TSchema extends Document>(name: string) {
  return getDb().collection<TSchema>(name);
}

async function ensureIndexes(database: Db) {
  await database
    .collection("users")
    .createIndex({ email: 1 }, { unique: true });
  await database
    .collection("sessions")
    .createIndex(
      { userId: 1, revokedAt: 1, expiresAt: 1 },
      { name: "session_user_status" }
    );
  await database
    .collection("sessions")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await database
    .collection("email_verifications")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await database.collection("email_verifications").createIndex({ userId: 1 });
  await database.collection("judge_attempts").createIndex(
    { token: 1 },
    {
      unique: true,
      partialFilterExpression: { token: { $exists: true } },
      name: "judge_attempt_token_unique",
    }
  );
  await database
    .collection("judge_attempts")
    .createIndex({ userId: 1, createdAt: -1 });
  await database
    .collection("profiles")
    .createIndex({ userId: 1 }, { unique: true });
  await database
    .collection("profiles")
    .createIndex({ location: 1, experienceYears: -1 });
  await database
    .collection("profiles")
    .createIndex({ technologies: 1 }, { name: "profiles_technologies_idx" });
  await database
    .collection("course_outlines")
    .createIndex({ requestId: 1 }, { unique: true });
  await database
    .collection("course_outlines")
    .createIndex({ technologySlug: 1, createdAt: -1 });
  await database
    .collection("course_outlines")
    .createIndex({ reviewStatus: 1, createdAt: -1 });
}
