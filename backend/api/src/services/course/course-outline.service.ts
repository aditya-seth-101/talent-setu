import { randomUUID } from "crypto";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import {
  createCourseOutline,
  findCourseOutlineById,
  listCourseOutlines,
  updateCourseOutlineReview,
  markCourseOutlinePublished,
} from "../../repositories/course-outline.repository.js";
import type {
  CourseOutline,
  PublicCourseOutline,
} from "../../models/course-outline.model.js";
import { mapCourseOutlineToPublic } from "../../models/course-outline.model.js";
import { courseOutlineSchema } from "../../schemas/course-outline.schema.js";
import { BadRequestError, NotFoundError } from "../../utils/http-errors.js";
import * as courseRepository from "../../repositories/course.repository.js";
import * as topicRepository from "../../repositories/topic.repository.js";
import * as challengeRepository from "../../repositories/challenge.repository.js";
import * as technologyRepository from "../../repositories/technology.repository.js";
import { normalizeTextKey, slugify, toTitleCase } from "../../utils/text.js";
import type { ObjectId as ObjectIdType } from "mongodb";
import { getCollection } from "../../services/database.js";
import type { CourseLevel as OutlineCourseLevel } from "../../schemas/course-outline.schema.js";
import type { CourseLevel } from "../../models/course.model.js";
import type { TopicDocument } from "../../models/topic.model.js";
import * as courseService from "./course.service.js";

const levelEnum = z.enum(["beginner", "intermediate", "advanced"]);
const reviewStatusEnum = z.enum(["pending", "approved", "rejected"]);

const generateOutlineSchema = z
  .object({
    technology: z.string().trim().min(2).max(80),
    level: levelEnum,
    seed: z.string().trim().optional(),
    forceRefresh: z.boolean().optional(),
  })
  .strict();

const listOutlineSchema = z
  .object({
    status: z.union([reviewStatusEnum, z.array(reviewStatusEnum)]).optional(),
    technology: z.string().trim().min(1).optional(),
    search: z.string().trim().min(1).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

const updateReviewSchema = z
  .object({
    reviewStatus: reviewStatusEnum,
    reviewNotes: z.union([z.string().trim().min(1), z.null()]).optional(),
  })
  .strict();

export type GenerateOutlineInput = z.infer<typeof generateOutlineSchema>;
export type ListOutlineQuery = z.infer<typeof listOutlineSchema>;
export type UpdateOutlineReviewInput = z.infer<typeof updateReviewSchema>;

export async function generateCourseOutline(
  payload: unknown,
  requestedBy: { id: string; email: string }
): Promise<PublicCourseOutline> {
  const parsed = generateOutlineSchema.parse(payload);
  const requestId = randomUUID();

  const aiPayload = {
    technology: parsed.technology,
    level: parsed.level,
    seed: parsed.seed,
    forceRefresh: parsed.forceRefresh ?? false,
  } satisfies GenerateOutlineInput;

  const response = await callAiService(aiPayload, requestId);
  const outline = parseOutlineResponse(response);

  const technologySlug = slugify(parsed.technology) || "unknown";

  const doc = await createCourseOutline({
    requestId,
    technology: parsed.technology,
    technologySlug,
    requestedLevel: parsed.level,
    seed: parsed.seed,
    forceRefresh: parsed.forceRefresh,
    requestedBy: toObjectId(requestedBy.id),
    requestedByEmail: requestedBy.email,
    outline,
    metadata: {
      aiServiceUrl: env.AI_SERVICE_URL,
      model: response.meta?.model,
      cached: response.meta?.cached,
    },
  });

  return mapCourseOutlineToPublic(doc);
}

export async function getCourseOutlineById(
  id: string
): Promise<PublicCourseOutline> {
  const doc = await findCourseOutlineById(toObjectId(id));

  if (!doc) {
    throw new NotFoundError("Course outline not found");
  }

  return mapCourseOutlineToPublic(doc);
}

export async function listCourseOutlineRequests(query: unknown): Promise<{
  outlines: PublicCourseOutline[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}> {
  const parsed = listOutlineSchema.parse(query);

  const { page, limit } = parsed;
  const skip = (page - 1) * limit;

  const reviewStatuses = parsed.status
    ? Array.isArray(parsed.status)
      ? parsed.status
      : [parsed.status]
    : undefined;

  const technologySlug = parsed.technology
    ? slugify(parsed.technology)
    : undefined;

  const { items, total } = await listCourseOutlines({
    reviewStatuses,
    technologySlug,
    search: parsed.search,
    limit,
    skip,
  });

  return {
    outlines: items.map(mapCourseOutlineToPublic),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function updateCourseOutlineReviewStatus(
  id: string,
  payload: unknown,
  reviewer: { id: string }
): Promise<PublicCourseOutline> {
  const parsed = updateReviewSchema.parse(payload);
  const objectId = toObjectId(id);

  const reviewNotes = Object.hasOwn(parsed, "reviewNotes")
    ? parsed.reviewNotes
    : undefined;

  const updated = await updateCourseOutlineReview(objectId, {
    reviewStatus: parsed.reviewStatus,
    reviewNotes,
    reviewedBy: toObjectId(reviewer.id),
  });

  if (!updated) {
    throw new NotFoundError("Course outline not found");
  }

  return mapCourseOutlineToPublic(updated);
}

interface AiServiceResponse {
  data: CourseOutline;
  meta?: {
    model?: string;
    cached?: boolean;
  };
}

async function callAiService(
  payload: GenerateOutlineInput,
  requestId: string
): Promise<AiServiceResponse> {
  let response: Response;

  try {
    response = await fetch(`${env.AI_SERVICE_URL}/prompt/course-outline`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-request-id": requestId,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to contact AI service");
    throw new BadRequestError("Unable to reach AI service");
  }

  if (!response.ok) {
    const errorText = await safeReadText(response);
    logger.error(
      {
        status: response.status,
        requestId,
        body: errorText,
      },
      "AI service returned an error"
    );
    throw new BadRequestError("AI service failed to generate course outline");
  }

  const json = (await response.json()) as unknown;

  if (!json || typeof json !== "object") {
    throw new BadRequestError("AI service returned an unexpected response");
  }

  return json as AiServiceResponse;
}

function parseOutlineResponse(response: AiServiceResponse): CourseOutline {
  try {
    return courseOutlineSchema.parse(response.data);
  } catch (error) {
    logger.error({ err: error }, "Invalid course outline payload from AI");
    throw new BadRequestError("AI service returned an invalid course outline");
  }
}

function toObjectId(id: string): ObjectId {
  try {
    return new ObjectId(id);
  } catch {
    throw new BadRequestError("Invalid object identifier");
  }
}

async function safeReadText(response: Response): Promise<string | undefined> {
  try {
    return await response.text();
  } catch (error) {
    logger.warn({ err: error }, "Failed to read error response body");
    return undefined;
  }
}

type PublicationResult = {
  outline: PublicCourseOutline;
  course: Awaited<ReturnType<typeof courseService.getCourseDetail>>;
};

export async function publishCourseOutline(
  id: string,
  actor: { id: string }
): Promise<PublicationResult> {
  const outlineId = toObjectId(id);
  const outline = await findCourseOutlineById(outlineId);

  if (!outline) {
    throw new NotFoundError("Course outline not found");
  }

  if (outline.reviewStatus !== "approved") {
    throw new BadRequestError(
      "Only approved outlines can be published into courses"
    );
  }

  if (outline.publishedCourseId) {
    const existingCourse = await courseService.getCourseDetail(
      outline.publishedCourseId.toHexString()
    );
    return {
      outline: mapCourseOutlineToPublic(outline),
      course: existingCourse,
    };
  }

  const technology = await technologyRepository.findTechnologyBySlug(
    outline.technologySlug
  );

  if (!technology) {
    throw new BadRequestError(
      `Technology mapping not found for ${outline.technology}`
    );
  }

  const judgeLanguageId = resolveJudgeLanguageId(
    technology.judge0_language_id,
    technology.judge0_language_key,
    outline.outline.languageKey
  );

  if (!judgeLanguageId) {
    throw new BadRequestError(
      `Unable to resolve Judge0 language id for ${outline.outline.languageKey}`
    );
  }

  const courseSlug = await generateUniqueCourseSlug(
    outline.outline.courseTitle
  );
  const createdCourse = await courseRepository.createCourse({
    slug: courseSlug,
    title: outline.outline.courseTitle,
    languageId: technology._id,
    languageKey: outline.outline.languageKey,
    description: outline.outline.description,
    levels: [],
    autoGenerated: true,
    status: "draft",
    meta: {
      outlineId: outline._id.toHexString(),
      outlineRequestId: outline.requestId,
      technologySlug: outline.technologySlug,
    },
  });

  const createdTopicIds: ObjectIdType[] = [];
  const createdChallengeIds: ObjectIdType[] = [];
  const topicRecords: Array<{
    topic: TopicDocument;
    prerequisites: string[];
  }> = [];
  const topicKeyToId = new Map<string, ObjectIdType>();
  const levelTopicIds = new Map<string, ObjectIdType[]>();
  let publicationComplete = false;

  try {
    for (const level of outline.outline.levels) {
      const levelDisplayName = toTitleCase(level.level);
      const difficulty = mapLevelToDifficulty(level.level);

      if (!levelTopicIds.has(levelDisplayName)) {
        levelTopicIds.set(levelDisplayName, []);
      }

      for (const topicBlueprint of level.topics) {
        const topicSlug = await generateUniqueTopicSlug(
          createdCourse._id,
          topicBlueprint.title
        );

        const youtubeLink = topicBlueprint.youtubeLink
          ? topicBlueprint.youtubeLink
          : buildYouTubeSearchUrl(topicBlueprint.youtubeSearchQuery);

        const topic = await topicRepository.createTopic({
          courseId: createdCourse._id,
          title: topicBlueprint.title,
          slug: topicSlug,
          description: topicBlueprint.description,
          youtubeLink,
          level: levelDisplayName,
          editorTemplate: topicBlueprint.starterCode,
          prerequisites: [],
          challengeIds: [],
        });

        createdTopicIds.push(topic._id);
        topicRecords.push({
          topic,
          prerequisites: topicBlueprint.prerequisites ?? [],
        });

        topicKeyToId.set(normalizeTextKey(topicBlueprint.title), topic._id);
        levelTopicIds.get(levelDisplayName)?.push(topic._id);

        const challengeIds: ObjectIdType[] = [];

        for (const mcq of topicBlueprint.mcqs) {
          const challenge = await challengeRepository.createChallenge({
            topicId: topic._id,
            type: "mcq",
            difficulty,
            prompt: mcq.question,
            mcq: {
              question: mcq.question,
              options: mcq.options,
              answerIndex: mcq.answerIndex,
            },
            hints: [],
          });

          createdChallengeIds.push(challenge._id);
          challengeIds.push(challenge._id);
        }

        const coding = topicBlueprint.codingChallenge;
        const codingLanguageId = resolveJudgeLanguageId(
          technology.judge0_language_id,
          technology.judge0_language_key,
          coding.languageKey
        );

        if (!codingLanguageId) {
          throw new BadRequestError(
            `Unable to resolve Judge0 language id for coding challenge ${coding.languageKey}`
          );
        }

        const codingChallenge = await challengeRepository.createChallenge({
          topicId: topic._id,
          type: "coding",
          difficulty,
          prompt: coding.prompt,
          judge0Spec: {
            languageId: codingLanguageId,
            stdin: coding.sampleInput,
            expectedOutput: coding.sampleOutput,
          },
          hints: [
            "Review the sample input and output to confirm the expected behavior before submitting.",
          ],
        });

        createdChallengeIds.push(codingChallenge._id);
        challengeIds.push(codingChallenge._id);

        await topicRepository.updateTopicById(topic._id, {
          challengeIds,
        });
      }
    }

    await resolveTopicPrerequisites(topicRecords, topicKeyToId);

    const courseLevels = buildCourseLevels(
      outline.outline.levels,
      levelTopicIds
    );
    const now = new Date();

    await courseRepository.updateCourseById(createdCourse._id, {
      levels: courseLevels,
      status: "published",
      autoGenerated: true,
      description: outline.outline.description,
      meta: {
        ...(createdCourse.meta ?? {}),
        outlineId: outline._id.toHexString(),
        outlineRequestId: outline.requestId,
        technologySlug: outline.technologySlug,
      },
      publishedAt: now,
    });

    const publishedRecord = await markCourseOutlinePublished(outline._id, {
      courseId: createdCourse._id,
      courseSlug,
      publishedAt: now,
      publishedBy: toObjectId(actor.id),
    });

    if (!publishedRecord) {
      throw new NotFoundError("Course outline not found while publishing");
    }

    publicationComplete = true;
  } catch (error) {
    await cleanupFailedPublication({
      courseId: createdCourse._id,
      topicIds: createdTopicIds,
      challengeIds: createdChallengeIds,
    });
    throw error;
  }

  if (!publicationComplete) {
    throw new BadRequestError("Course publication failed unexpectedly");
  }

  const [updatedOutline, courseDetail] = await Promise.all([
    findCourseOutlineById(outline._id).then((doc) => {
      if (!doc) {
        throw new NotFoundError("Published outline could not be reloaded");
      }
      return mapCourseOutlineToPublic(doc);
    }),
    courseService.getCourseDetail(createdCourse._id.toHexString()),
  ]);

  return {
    outline: updatedOutline,
    course: courseDetail,
  };
}

async function resolveTopicPrerequisites(
  records: Array<{ topic: TopicDocument; prerequisites: string[] }>,
  topicKeyToId: Map<string, ObjectIdType>
) {
  await Promise.all(
    records.map(async ({ topic, prerequisites }) => {
      if (!prerequisites || prerequisites.length === 0) {
        return;
      }

      const resolved = prerequisites
        .map((item) => topicKeyToId.get(normalizeTextKey(item)))
        .filter((id): id is ObjectIdType => Boolean(id));

      if (resolved.length === 0) {
        return;
      }

      const seen = new Set<string>();
      const uniqueResolved: ObjectIdType[] = [];

      for (const id of resolved) {
        const key = id.toHexString();
        if (!seen.has(key)) {
          seen.add(key);
          uniqueResolved.push(id);
        }
      }

      await topicRepository.updateTopicById(topic._id, {
        prerequisites: uniqueResolved,
      });
    })
  );
}

function buildCourseLevels(
  levels: OutlineCourseLevel[],
  levelTopicIds: Map<string, ObjectIdType[]>
): CourseLevel[] {
  return levels.map((level) => {
    const displayName = toTitleCase(level.level);
    return {
      name: displayName,
      topicIds: levelTopicIds.get(displayName) ?? [],
    };
  });
}

async function generateUniqueCourseSlug(title: string): Promise<string> {
  const baseSlug = slugify(title) || `course-${randomUUID().slice(0, 8)}`;
  let slug = baseSlug;
  let counter = 1;

  while (await courseRepository.findCourseBySlug(slug)) {
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }

  return slug;
}

async function generateUniqueTopicSlug(
  courseId: ObjectIdType,
  title: string
): Promise<string> {
  const baseSlug = slugify(title) || `topic-${randomUUID().slice(0, 8)}`;
  let slug = baseSlug;
  let counter = 1;

  const topicsCollection = getCollection("topics");

  while (
    await topicsCollection.findOne({
      courseId,
      slug,
    })
  ) {
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }

  return slug;
}

async function cleanupFailedPublication({
  courseId,
  topicIds,
  challengeIds,
}: {
  courseId: ObjectIdType;
  topicIds: ObjectIdType[];
  challengeIds: ObjectIdType[];
}) {
  const topicsCollection = getCollection("topics");
  const challengesCollection = getCollection("challenges");
  const coursesCollection = getCollection("courses");

  if (challengeIds.length > 0) {
    await challengesCollection.deleteMany({
      _id: { $in: challengeIds },
    });
  }

  if (topicIds.length > 0) {
    await topicsCollection.deleteMany({
      _id: { $in: topicIds },
    });
  }

  await coursesCollection.deleteOne({ _id: courseId });
}

function mapLevelToDifficulty(
  level: "beginner" | "intermediate" | "advanced"
): "beginner" | "intermediate" | "advanced" {
  switch (level) {
    case "beginner":
      return "beginner";
    case "intermediate":
      return "intermediate";
    case "advanced":
      return "advanced";
    default:
      return "beginner";
  }
}

function buildYouTubeSearchUrl(query: string): string {
  const encoded = encodeURIComponent(query.trim());
  return `https://www.youtube.com/results?search_query=${encoded}`;
}

function resolveJudgeLanguageId(
  technologyLanguageId: number | undefined,
  technologyLanguageKey: string,
  requestedLanguageKey: string
): number | null {
  if (technologyLanguageId && technologyLanguageId > 0) {
    return technologyLanguageId;
  }

  const normalizedRequested = requestedLanguageKey.toLowerCase();
  const normalizedTechnology = technologyLanguageKey.toLowerCase();

  if (normalizedRequested === normalizedTechnology) {
    return JUDGE_LANGUAGE_MAP[normalizedRequested] ?? null;
  }

  return JUDGE_LANGUAGE_MAP[normalizedRequested] ?? null;
}

const JUDGE_LANGUAGE_MAP: Record<string, number> = {
  javascript: 63,
  node: 63,
  nodejs: 63,
  js: 63,
  typescript: 74,
  ts: 74,
  python: 70,
  python3: 71,
};
