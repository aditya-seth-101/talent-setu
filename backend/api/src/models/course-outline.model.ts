import type { ObjectId } from "mongodb";
import type {
  CourseOutline,
  CourseTopic,
  CourseLevel,
  CourseMCQ,
  CourseCodingChallenge,
} from "../schemas/course-outline.schema.js";

export type OutlineReviewStatus = "pending" | "approved" | "rejected";

export interface CourseOutlineDocument {
  _id: ObjectId;
  requestId: string;
  technology: string;
  technologySlug: string;
  requestedLevel: "beginner" | "intermediate" | "advanced";
  seed?: string;
  forceRefresh?: boolean;
  requestedBy: ObjectId;
  requestedByEmail?: string;
  outline: CourseOutline;
  reviewStatus: OutlineReviewStatus;
  reviewNotes?: string;
  reviewedBy?: ObjectId;
  reviewedAt?: Date;
  metadata: {
    aiServiceUrl: string;
    model?: string;
    cached?: boolean;
  };
  publishedCourseId?: ObjectId;
  publishedCourseSlug?: string;
  publishedBy?: ObjectId;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  generatedAt: Date;
}

export interface CreateCourseOutlineInput {
  requestId: string;
  technology: string;
  technologySlug: string;
  requestedLevel: "beginner" | "intermediate" | "advanced";
  requestedBy: ObjectId;
  requestedByEmail?: string;
  outline: CourseOutline;
  metadata: {
    aiServiceUrl: string;
    model?: string;
    cached?: boolean;
  };
  seed?: string;
  forceRefresh?: boolean;
}

export interface UpdateCourseOutlineReviewInput {
  reviewStatus: OutlineReviewStatus;
  reviewNotes?: string | null;
  reviewedBy: ObjectId;
}

export type PublicCourseOutline = {
  id: string;
  requestId: string;
  technology: string;
  technologySlug: string;
  requestedLevel: "beginner" | "intermediate" | "advanced";
  seed?: string;
  forceRefresh?: boolean;
  reviewStatus: OutlineReviewStatus;
  reviewNotes?: string | null;
  requestedBy: string;
  requestedByEmail?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  outline: CourseOutline;
  metadata: {
    aiServiceUrl: string;
    model?: string;
    cached?: boolean;
  };
  publishedCourseId?: string;
  publishedCourseSlug?: string;
  publishedBy?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  generatedAt: string;
};

export {
  CourseOutline,
  CourseTopic,
  CourseLevel,
  CourseMCQ,
  CourseCodingChallenge,
};

export function mapCourseOutlineToPublic(
  doc: CourseOutlineDocument
): PublicCourseOutline {
  return {
    id: doc._id.toHexString(),
    requestId: doc.requestId,
    technology: doc.technology,
    technologySlug: doc.technologySlug,
    requestedLevel: doc.requestedLevel,
    reviewStatus: doc.reviewStatus,
    reviewNotes: doc.reviewNotes ?? null,
    requestedBy: doc.requestedBy.toHexString(),
    requestedByEmail: doc.requestedByEmail,
    reviewedBy: doc.reviewedBy?.toHexString(),
    reviewedAt: doc.reviewedAt?.toISOString(),
    outline: doc.outline,
    metadata: doc.metadata,
    publishedCourseId: doc.publishedCourseId?.toHexString(),
    publishedCourseSlug: doc.publishedCourseSlug,
    publishedBy: doc.publishedBy?.toHexString(),
    publishedAt: doc.publishedAt?.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    generatedAt: doc.generatedAt.toISOString(),
    seed: doc.seed,
    forceRefresh: doc.forceRefresh,
  };
}
