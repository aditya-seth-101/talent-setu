import { ObjectId } from "mongodb";
import { z } from "zod";
import {
  createProfile,
  findProfileById,
  findProfileByUserId,
  searchProfiles as searchProfilesRepo,
  updateProfileById,
} from "../../repositories/profile.repository.js";
import type { ProfileSearchFilters } from "../../repositories/profile.repository.js";
import {
  mapProfileToPublic,
  type PublicProfile,
  type UpdateProfileInput,
} from "../../models/profile.model.js";
import { BadRequestError, NotFoundError } from "../../utils/http-errors.js";
import { createEmptyLearningProgress } from "../../models/learning-progress.model.js";

const availabilityEnum = z.enum(["open", "interviewing", "unavailable"]);

const updateProfileSchema = z
  .object({
    displayName: z
      .union([z.string().trim().min(1).max(120), z.null()])
      .optional(),
    headline: z.union([z.string().trim().min(1).max(200), z.null()]).optional(),
    location: z.union([z.string().trim().min(1).max(120), z.null()]).optional(),
    experienceYears: z.union([z.number().min(0).max(60), z.null()]).optional(),
    technologies: z
      .union([z.array(z.string().length(24)).max(25), z.null()])
      .optional(),
    resumeUrl: z.union([z.string().url(), z.null()]).optional(),
    availability: z.union([availabilityEnum, z.null()]).optional(),
  })
  .strict();

const searchProfilesSchema = z
  .object({
    q: z.string().trim().min(1).optional(),
    location: z.string().trim().min(1).optional(),
    technology: z
      .union([z.string().length(24), z.array(z.string().length(24))])
      .optional(),
    minExperience: z.coerce.number().min(0).max(60).optional(),
    maxExperience: z.coerce.number().min(0).max(60).optional(),
    availability: z
      .union([availabilityEnum, z.array(availabilityEnum).nonempty()])
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export async function ensureDefaultProfileForUser({
  userId,
  email,
}: {
  userId: ObjectId;
  email: string;
}): Promise<PublicProfile> {
  const existing = await findProfileByUserId(userId);
  if (existing) {
    return mapProfileToPublic(existing);
  }

  const displayName = buildDisplayNameFromEmail(email);

  const created = await createProfile({
    userId,
    displayName,
    technologies: [],
    learningProgress: createEmptyLearningProgress(),
  });

  return mapProfileToPublic(created);
}

export async function getProfileForUser(
  userId: string
): Promise<PublicProfile> {
  const profile = await findProfileByUserId(userId);
  if (!profile) {
    throw new NotFoundError("Profile not found for user");
  }

  return mapProfileToPublic(profile);
}

export async function updateProfileForUser(
  userId: string,
  payload: unknown
): Promise<PublicProfile> {
  const profile = await findProfileByUserId(userId);

  if (!profile) {
    throw new NotFoundError("Profile not found for user");
  }

  const parsed = updateProfileSchema.parse(payload);
  const update: UpdateProfileInput = {};

  if (parsed.displayName !== undefined) {
    update.displayName = parsed.displayName;
  }

  if (parsed.headline !== undefined) {
    update.headline = parsed.headline;
  }

  if (parsed.location !== undefined) {
    update.location = parsed.location;
  }

  if (parsed.experienceYears !== undefined) {
    update.experienceYears = parsed.experienceYears;
  }

  if (parsed.resumeUrl !== undefined) {
    update.resumeUrl = parsed.resumeUrl;
  }

  if (parsed.availability !== undefined) {
    update.availability = parsed.availability;
  }

  if (parsed.technologies !== undefined) {
    update.technologies =
      parsed.technologies === null
        ? null
        : parsed.technologies.map((id) => new ObjectId(id));
  }

  const updated = await updateProfileById(profile._id, update);

  if (!updated) {
    throw new BadRequestError("Failed to update profile");
  }

  return mapProfileToPublic(updated);
}

export async function getProfileById(id: string): Promise<PublicProfile> {
  const profile = await findProfileById(id);

  if (!profile) {
    throw new NotFoundError("Profile not found");
  }

  return mapProfileToPublic(profile);
}

export async function searchProfiles(query: unknown): Promise<{
  profiles: PublicProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const parsed = searchProfilesSchema.parse(query);

  if (
    parsed.minExperience !== undefined &&
    parsed.maxExperience !== undefined &&
    parsed.minExperience > parsed.maxExperience
  ) {
    throw new BadRequestError(
      "minExperience cannot be greater than maxExperience"
    );
  }

  const { page, limit } = parsed;
  const skip = (page - 1) * limit;

  const filters: ProfileSearchFilters = {
    limit,
    skip,
  };

  if (parsed.location) {
    filters.location = parsed.location;
  }

  if (parsed.q) {
    filters.text = parsed.q;
  }

  if (parsed.minExperience !== undefined) {
    filters.minExperience = parsed.minExperience;
  }

  if (parsed.maxExperience !== undefined) {
    filters.maxExperience = parsed.maxExperience;
  }

  if (parsed.availability) {
    filters.availability = Array.isArray(parsed.availability)
      ? parsed.availability
      : [parsed.availability];
  }

  if (parsed.technology) {
    const technologies = Array.isArray(parsed.technology)
      ? parsed.technology
      : [parsed.technology];

    filters.technologyIds = technologies.map((id) => new ObjectId(id));
  }

  const { items, total } = await searchProfilesRepo(filters);

  return {
    profiles: items.map(mapProfileToPublic),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

function buildDisplayNameFromEmail(email: string): string {
  const [localPart] = email.split("@");
  if (!localPart) {
    return "New Talent";
  }

  const normalized = localPart
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1));

  return normalized.length > 0 ? normalized.join(" ") : "New Talent";
}
