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
  // Recruitment-specific indexes: support sorting/filtering by recruitmentScore and
  // efficient lookups when filtering by technologies + score.
  await database
    .collection("profiles")
    .createIndex(
      { recruitmentScore: -1 },
      { name: "profiles_recruitment_score" }
    );
  await database
    .collection("profiles")
    .createIndex(
      { technologies: 1, recruitmentScore: -1 },
      { name: "profiles_technologies_recruitment_score" }
    );
  await database
    .collection("assessment_templates")
    .createIndex(
      { createdBy: 1, status: 1 },
      { name: "assessment_templates_creator_status" }
    );
  await database
    .collection("assessment_templates")
    .createIndex(
      { status: 1, updatedAt: -1 },
      { name: "assessment_templates_status_updated" }
    );
  await database
    .collection("assessments")
    .createIndex(
      { candidateId: 1, status: 1 },
      { name: "assessments_candidate_status" }
    );
  // Support efficient retrieval of most recent assessments for a candidate.
  await database
    .collection("assessments")
    .createIndex(
      { candidateId: 1, updatedAt: -1 },
      { name: "assessments_candidate_recent" }
    );
  await database
    .collection("assessments")
    .createIndex(
      { recruiterId: 1, status: 1 },
      { name: "assessments_recruiter_status" }
    );
  await database
    .collection("assessments")
    .createIndex(
      { uniqueSeed: 1 },
      { unique: true, name: "assessments_unique_seed" }
    );
  await database
    .collection("course_outlines")
    .createIndex({ requestId: 1 }, { unique: true });
  await database
    .collection("course_outlines")
    .createIndex({ technologySlug: 1, createdAt: -1 });
  await database
    .collection("course_outlines")
    .createIndex({ reviewStatus: 1, createdAt: -1 });
  await database
    .collection("technologies")
    .createIndex(
      { slug: 1 },
      { unique: true, name: "technologies_slug_unique" }
    );
  await database
    .collection("technologies")
    .createIndex(
      { judge0_language_key: 1 },
      { unique: true, name: "technologies_language_key_unique" }
    );
  await database.collection("technology_requests").createIndex(
    { slug: 1 },
    {
      unique: true,
      name: "technology_requests_unique_pending_slug",
      partialFilterExpression: { status: "pending" },
    }
  );
  await database
    .collection("technology_requests")
    .createIndex(
      { status: 1, createdAt: -1 },
      { name: "technology_requests_status_created" }
    );
  await database
    .collection("technology_requests")
    .createIndex(
      { requestedBy: 1, createdAt: -1 },
      { name: "technology_requests_requester_created" }
    );
  await database
    .collection("roles")
    .createIndex({ slug: 1 }, { unique: true, name: "roles_slug_unique" });
  await database
    .collection("roles")
    .createIndex({ assignable: 1, name: 1 }, { name: "roles_assignable_name" });
  await database
    .collection("courses")
    .createIndex({ slug: 1 }, { unique: true, name: "courses_slug_unique" });
  await database
    .collection("courses")
    .createIndex(
      { status: 1, createdAt: -1 },
      { name: "courses_status_created" }
    );
  await database
    .collection("topics")
    .createIndex(
      { courseId: 1, level: 1, title: 1 },
      { name: "topics_course_level_title" }
    );
  await database
    .collection("topics")
    .createIndex(
      { courseId: 1, slug: 1 },
      { unique: true, name: "topics_course_slug_unique" }
    );
  await database
    .collection("challenges")
    .createIndex({ topicId: 1, type: 1 }, { name: "challenges_topic_type" });
  await database
    .collection("challenges")
    .createIndex({ createdAt: 1 }, { name: "challenges_created_at" });
}
