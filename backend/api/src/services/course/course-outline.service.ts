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
} from "../../repositories/course-outline.repository.js";
import type {
  CourseOutline,
  PublicCourseOutline,
} from "../../models/course-outline.model.js";
import { mapCourseOutlineToPublic } from "../../models/course-outline.model.js";
import { courseOutlineSchema } from "../../schemas/course-outline.schema.js";
import { BadRequestError, NotFoundError } from "../../utils/http-errors.js";

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

  const technologySlug = slugify(parsed.technology);

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

function slugify(value: string): string {
  const normalized = value.trim().toLowerCase();
  const slug = normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || normalized || "unknown";
}

async function safeReadText(response: Response): Promise<string | undefined> {
  try {
    return await response.text();
  } catch (error) {
    logger.warn({ err: error }, "Failed to read error response body");
    return undefined;
  }
}
