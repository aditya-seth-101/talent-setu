import type {
  Collection,
  Filter,
  OptionalUnlessRequiredId,
  UpdateFilter,
} from "mongodb";
import { ObjectId } from "mongodb";
import type {
  CourseOutlineDocument,
  CreateCourseOutlineInput,
  OutlineReviewStatus,
  UpdateCourseOutlineReviewInput,
} from "../models/course-outline.model.js";
import { getCollection } from "../services/database.js";

function courseOutlinesCollection(): Collection<CourseOutlineDocument> {
  return getCollection<CourseOutlineDocument>("course_outlines");
}

export async function createCourseOutline(
  input: CreateCourseOutlineInput
): Promise<CourseOutlineDocument> {
  const now = new Date();

  const doc: Omit<CourseOutlineDocument, "_id"> = {
    requestId: input.requestId,
    technology: input.technology,
    technologySlug: input.technologySlug,
    requestedLevel: input.requestedLevel,
    seed: input.seed,
    forceRefresh: input.forceRefresh,
    requestedBy: input.requestedBy,
    requestedByEmail: input.requestedByEmail,
    outline: input.outline,
    reviewStatus: "pending",
    metadata: input.metadata,
    createdAt: now,
    updatedAt: now,
    generatedAt: now,
  };

  const result = await courseOutlinesCollection().insertOne(
    doc as OptionalUnlessRequiredId<CourseOutlineDocument>
  );

  return {
    _id: result.insertedId,
    ...doc,
  };
}

export async function findCourseOutlineById(
  id: string | ObjectId
): Promise<CourseOutlineDocument | null> {
  const objectId = typeof id === "string" ? new ObjectId(id) : id;
  return courseOutlinesCollection().findOne({ _id: objectId });
}

export interface CourseOutlineListFilters {
  reviewStatuses?: OutlineReviewStatus[];
  technologySlug?: string;
  search?: string;
  limit: number;
  skip: number;
}

type CourseOutlineFilter = Filter<CourseOutlineDocument> & {
  "outline.courseTitle"?: { $regex: RegExp };
};

export async function listCourseOutlines({
  reviewStatuses,
  technologySlug,
  search,
  limit,
  skip,
}: CourseOutlineListFilters): Promise<{
  items: CourseOutlineDocument[];
  total: number;
}> {
  const filter: CourseOutlineFilter = {};

  if (reviewStatuses && reviewStatuses.length > 0) {
    filter.reviewStatus = {
      $in: reviewStatuses,
    } as Filter<CourseOutlineDocument>["reviewStatus"];
  }

  if (technologySlug) {
    filter.technologySlug = technologySlug;
  }

  if (search) {
    filter["outline.courseTitle"] = {
      $regex: new RegExp(escapeRegex(search), "i"),
    };
  }

  const cursor = courseOutlinesCollection()
    .find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const [items, total] = await Promise.all([
    cursor.toArray(),
    courseOutlinesCollection().countDocuments(filter),
  ]);

  return { items, total };
}

export async function updateCourseOutlineReview(
  id: ObjectId,
  { reviewStatus, reviewNotes, reviewedBy }: UpdateCourseOutlineReviewInput
): Promise<CourseOutlineDocument | null> {
  const now = new Date();
  const setOps: Record<string, unknown> = {
    reviewStatus,
    updatedAt: now,
  };

  const unsetOps: Record<string, ""> = {};

  if (reviewStatus === "pending") {
    unsetOps.reviewedBy = "";
    unsetOps.reviewedAt = "";
  } else {
    setOps.reviewedBy = reviewedBy;
    setOps.reviewedAt = now;
  }

  if (reviewNotes !== undefined) {
    if (reviewNotes === null) {
      unsetOps.reviewNotes = "";
    } else {
      setOps.reviewNotes = reviewNotes;
    }
  }

  const update: UpdateFilter<CourseOutlineDocument> = {
    $set: setOps,
  };

  if (Object.keys(unsetOps).length > 0) {
    update.$unset = unsetOps;
  }

  const updated = await courseOutlinesCollection().findOneAndUpdate(
    { _id: id },
    update,
    { returnDocument: "after" }
  );

  return updated ?? null;
}

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
