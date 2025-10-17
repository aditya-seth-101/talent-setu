import { ObjectId } from "mongodb";
import { z } from "zod";
import type { TechnologyDocument } from "../../models/technology.model.js";
import type { TechnologyRequestDocument } from "../../models/technology-request.model.js";
import {
  createTechnology,
  findTechnologiesByIds,
  findTechnologiesBySlugOrAlias,
  searchTechnologies,
  addAliasesToTechnology,
} from "../../repositories/technology.repository.js";
import {
  createTechnologyRequest,
  findLatestPendingRequestBySlug,
  findTechnologyRequestById,
  listTechnologyRequests,
  updateTechnologyRequest,
} from "../../repositories/technology-request.repository.js";
import { findUsersByIds } from "../../repositories/user.repository.js";
import { findProfilesByUserIds } from "../../repositories/profile.repository.js";
import { BadRequestError, NotFoundError } from "../../utils/http-errors.js";
import { slugify } from "../../utils/text.js";

const objectIdSchema = z.string().length(24, "Invalid id format");

const searchQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const technologyRequestSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(500).optional(),
    aliases: z.array(z.string().trim().min(1).max(120)).optional(),
  })
  .strict();

const requestListSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

const reviewPayloadSchema = z
  .object({
    decision: z.enum(["approve", "reject"]),
    notes: z.string().trim().max(500).optional(),
    mapping: z
      .discriminatedUnion("type", [
        z.object({
          type: z.literal("mapExisting"),
          technologyId: objectIdSchema,
          aliases: z.array(z.string().trim().min(1).max(120)).optional(),
        }),
        z.object({
          type: z.literal("createNew"),
          aliases: z.array(z.string().trim().min(1).max(120)).optional(),
          judge0LanguageKey: z.string().trim().min(1).optional(),
          judge0LanguageId: z.coerce.number().int().min(1).optional(),
        }),
      ])
      .optional(),
  })
  .strict();

function sanitizeAliases(raw: string[] | undefined): string[] {
  if (!raw?.length) {
    return [];
  }
  const seen = new Set<string>();
  const aliases: string[] = [];
  for (const value of raw) {
    const alias = value.trim();
    if (!alias) continue;
    const key = alias.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    aliases.push(alias);
  }
  return aliases;
}

export async function searchTechnologyDirectory(query: unknown) {
  const { q, limit } = searchQuerySchema.parse(query ?? {});
  const results = await searchTechnologies(q, limit);
  return {
    technologies: results.map(mapTechnology),
  };
}

export async function requestNewTechnology(
  body: unknown,
  userId: string | undefined
) {
  if (!userId) {
    throw new BadRequestError("Authenticated user is required");
  }

  const parsed = technologyRequestSchema.parse(body);
  const slug = slugify(parsed.name);
  if (!slug) {
    throw new BadRequestError("Unable to derive slug from technology name");
  }

  const sanitizedAliases = sanitizeAliases(parsed.aliases);
  const candidateTechnologies = await findTechnologiesBySlugOrAlias(slug);
  const existingPending = await findLatestPendingRequestBySlug(slug);

  if (existingPending) {
    const userMap = await loadUserMap([
      existingPending.requestedBy.toHexString(),
      existingPending.reviewerId
        ? existingPending.reviewerId.toHexString()
        : undefined,
    ]);
    return {
      request: mapTechnologyRequest(existingPending, undefined, userMap),
      duplicateOf: existingPending._id.toHexString(),
      suggestions: await hydrateTechnologySummary(candidateTechnologies),
      duplicate: true,
    };
  }

  const requestDoc = await createTechnologyRequest({
    name: parsed.name,
    slug,
    description: parsed.description,
    aliases: sanitizedAliases,
    requestedBy: new ObjectId(userId),
    candidateTechnologyIds: candidateTechnologies.map((tech) => tech._id),
  });

  const userMap = await loadUserMap([requestDoc.requestedBy.toHexString()]);

  return {
    request: mapTechnologyRequest(requestDoc, undefined, userMap),
    suggestions: await hydrateTechnologySummary(candidateTechnologies),
    duplicate: candidateTechnologies.length > 0,
  };
}

export async function listTechnologyRequestQueue(query: unknown) {
  const parsed = requestListSchema.parse(query ?? {});
  const { items, total } = await listTechnologyRequests(parsed);

  const technologyIds = new Set<string>();
  const userIds = new Set<string>();
  for (const item of items) {
    userIds.add(item.requestedBy.toHexString());
    if (item.reviewerId) {
      userIds.add(item.reviewerId.toHexString());
    }
    for (const candidate of item.candidateTechnologyIds) {
      technologyIds.add(candidate.toHexString());
    }
    if (item.mappedTechnologyId) {
      technologyIds.add(item.mappedTechnologyId.toHexString());
    }
    if (item.createdTechnologyId) {
      technologyIds.add(item.createdTechnologyId.toHexString());
    }
  }

  const [technologyMap, userMap] = await Promise.all([
    loadTechnologyMap([...technologyIds]),
    loadUserMap([...userIds]),
  ]);

  return {
    requests: items.map((item) =>
      mapTechnologyRequest(item, technologyMap, userMap)
    ),
    pagination: {
      page: parsed.page,
      limit: parsed.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / parsed.limit)),
    },
  };
}

export async function reviewTechnologyRequest(
  requestId: string,
  payload: unknown,
  reviewerId: string | undefined
) {
  if (!reviewerId) {
    throw new BadRequestError("Authenticated reviewer required");
  }

  const parsed = reviewPayloadSchema.parse(payload);
  const id = new ObjectId(requestId);
  const request = await findTechnologyRequestById(id);

  if (!request) {
    throw new NotFoundError("Technology request not found");
  }

  if (request.status !== "pending") {
    throw new BadRequestError("Only pending requests can be reviewed");
  }

  const reviewerObjectId = new ObjectId(reviewerId);

  if (parsed.decision === "reject") {
    const updated = await updateTechnologyRequest(id, {
      status: "rejected",
      reviewerId: reviewerObjectId,
      reviewerNotes: parsed.notes ?? null,
    });
    const userMap = await loadUserMap([
      request.requestedBy.toHexString(),
      reviewerObjectId.toHexString(),
    ]);
    return {
      request: mapTechnologyRequest(updated!, undefined, userMap),
    };
  }

  if (!parsed.mapping) {
    throw new BadRequestError("Approval decision requires mapping details");
  }

  const mergedAliases = sanitizeAliases([
    request.name,
    ...request.aliases,
    ...(parsed.mapping.aliases ?? []),
  ]);

  if (parsed.mapping.type === "mapExisting") {
    const technologyId = new ObjectId(parsed.mapping.technologyId);
    const technology = await addAliasesToTechnology(
      technologyId,
      mergedAliases
    );

    if (!technology) {
      throw new NotFoundError("Target technology not found");
    }

    const updated = await updateTechnologyRequest(id, {
      status: "approved",
      reviewerId: reviewerObjectId,
      reviewerNotes: parsed.notes ?? null,
      mappedTechnologyId: technologyId,
    });
    const userMap = await loadUserMap([
      request.requestedBy.toHexString(),
      reviewerObjectId.toHexString(),
    ]);

    return {
      request: mapTechnologyRequest(updated!, undefined, userMap),
      technology: mapTechnology(technology),
    };
  }

  const judge0Key =
    parsed.mapping.judge0LanguageKey?.trim() || request.slug.replace(/-/g, "_");

  const newTechnology = await createTechnology({
    name: request.name,
    slug: request.slug,
    judge0LanguageKey: judge0Key,
    judge0LanguageId: parsed.mapping.judge0LanguageId ?? undefined,
    aliases: mergedAliases,
    status: "active",
    createdBy: request.requestedBy,
    approvedBy: reviewerObjectId,
  });

  const updated = await updateTechnologyRequest(id, {
    status: "approved",
    reviewerId: reviewerObjectId,
    reviewerNotes: parsed.notes ?? null,
    createdTechnologyId: newTechnology._id,
  });

  const userMap = await loadUserMap([
    request.requestedBy.toHexString(),
    reviewerObjectId.toHexString(),
  ]);

  return {
    request: mapTechnologyRequest(updated!, undefined, userMap),
    technology: mapTechnology(newTechnology),
  };
}

function mapTechnology(technology: TechnologyDocument) {
  const aliases = Array.isArray(technology.aliases) ? technology.aliases : [];
  const status = technology.status ?? "active";
  return {
    id: technology._id.toHexString(),
    name: technology.name,
    slug: technology.slug,
    aliases,
    judge0LanguageKey: technology.judge0_language_key,
    judge0LanguageId: technology.judge0_language_id ?? null,
    status,
  };
}

interface RequestUserSummary {
  id: string;
  email: string;
  displayName: string | null;
}

function mapTechnologyRequest(
  request: TechnologyRequestDocument,
  technologyMap?: Map<string, ReturnType<typeof mapTechnology>>,
  userMap?: Map<string, RequestUserSummary>
) {
  const requestedById = request.requestedBy.toHexString();
  const reviewerId = request.reviewerId
    ? request.reviewerId.toHexString()
    : null;
  return {
    id: request._id.toHexString(),
    name: request.name,
    slug: request.slug,
    description: request.description ?? null,
    aliases: request.aliases ?? [],
    status: request.status,
    requestedBy: requestedById,
    requestedByUser: userMap?.get(requestedById) ?? null,
    reviewerId,
    reviewer: reviewerId ? userMap?.get(reviewerId) ?? null : null,
    reviewerNotes: request.reviewerNotes ?? null,
    mappedTechnologyId: request.mappedTechnologyId
      ? request.mappedTechnologyId.toHexString()
      : null,
    createdTechnologyId: request.createdTechnologyId
      ? request.createdTechnologyId.toHexString()
      : null,
    candidateTechnologyIds: request.candidateTechnologyIds.map((id) =>
      id.toHexString()
    ),
    candidates: technologyMap
      ? request.candidateTechnologyIds
          .map((id) => technologyMap.get(id.toHexString()))
          .filter((value): value is ReturnType<typeof mapTechnology> =>
            Boolean(value)
          )
      : [],
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

async function hydrateTechnologySummary(technologies: TechnologyDocument[]) {
  return technologies.map(mapTechnology);
}

async function loadTechnologyMap(ids: string[]) {
  if (!ids.length) {
    return new Map<string, ReturnType<typeof mapTechnology>>();
  }
  const objectIds = ids.map((id) => new ObjectId(id));
  const technologies = await findTechnologiesByIds(objectIds);
  const map = new Map<string, ReturnType<typeof mapTechnology>>();
  for (const technology of technologies) {
    map.set(technology._id.toHexString(), mapTechnology(technology));
  }
  return map;
}

async function loadUserMap(ids: Array<string | undefined>) {
  const unique = Array.from(
    new Set(ids.filter((value): value is string => Boolean(value)))
  );

  if (!unique.length) {
    return new Map<string, RequestUserSummary>();
  }

  const objectIds = unique.map((id) => new ObjectId(id));
  const [users, profiles] = await Promise.all([
    findUsersByIds(objectIds),
    findProfilesByUserIds(objectIds),
  ]);

  const profileMap = new Map<string, string>();
  for (const profile of profiles) {
    profileMap.set(profile.userId.toHexString(), profile.displayName);
  }

  const map = new Map<string, RequestUserSummary>();
  for (const user of users) {
    const id = user._id.toHexString();
    map.set(id, {
      id,
      email: user.email,
      displayName: profileMap.get(id) ?? null,
    });
  }

  return map;
}
