import type {
  Collection,
  Document,
  Filter,
  FilterOperators,
  OptionalUnlessRequiredId,
  UpdateFilter,
} from "mongodb";
import { ObjectId } from "mongodb";
import {
  type AvailabilityStatus,
  type CreateProfileInput,
  type ProfileDocument,
  type UpdateProfileInput,
} from "../models/profile.model.js";
import {
  createEmptyLearningProgress,
  mergeLegacyLearningProgress,
  type LearningProgressState,
} from "../models/learning-progress.model.js";
import { getCollection } from "../services/database.js";

function profilesCollection(): Collection<ProfileDocument> {
  return getCollection<ProfileDocument>("profiles");
}

export async function createProfile(
  input: CreateProfileInput
): Promise<ProfileDocument> {
  const now = new Date();
  const doc: Omit<ProfileDocument, "_id"> = {
    userId: input.userId,
    displayName: input.displayName,
    headline: input.headline,
    location: input.location,
    experienceYears: input.experienceYears,
    technologies: input.technologies ?? [],
    resumeUrl: input.resumeUrl,
    availability: input.availability,
    learningProgress: mergeLegacyLearningProgress(
      input.learningProgress ?? createEmptyLearningProgress()
    ),
    recruitmentScore: input.recruitmentScore,
    createdAt: now,
    updatedAt: now,
  };

  const result = await profilesCollection().insertOne(
    doc as OptionalUnlessRequiredId<ProfileDocument>
  );

  return {
    _id: result.insertedId,
    ...doc,
  };
}

export async function findProfileByUserId(
  userId: string | ObjectId
): Promise<ProfileDocument | null> {
  const profile = await profilesCollection().findOne({
    userId: toObjectId(userId),
  });

  if (profile) {
    profile.learningProgress = mergeLegacyLearningProgress(
      profile.learningProgress
    );
  }

  return profile;
}

export async function findProfileById(
  id: string | ObjectId
): Promise<ProfileDocument | null> {
  const profile = await profilesCollection().findOne({ _id: toObjectId(id) });

  if (profile) {
    profile.learningProgress = mergeLegacyLearningProgress(
      profile.learningProgress
    );
  }

  return profile;
}

export async function updateProfileById(
  id: ObjectId,
  updates: UpdateProfileInput
): Promise<ProfileDocument | null> {
  const $set: Record<string, unknown> = { updatedAt: new Date() };
  const $unset: Record<string, ""> = {};

  applyUpdateField($set, $unset, "displayName", updates.displayName);
  applyUpdateField($set, $unset, "headline", updates.headline);
  applyUpdateField($set, $unset, "location", updates.location);
  applyUpdateField($set, $unset, "resumeUrl", updates.resumeUrl);
  applyUpdateField($set, $unset, "availability", updates.availability);
  applyUpdateField($set, $unset, "experienceYears", updates.experienceYears);
  applyUpdateField($set, $unset, "recruitmentScore", updates.recruitmentScore);

  if (updates.learningProgress !== undefined) {
    if (updates.learningProgress === null) {
      $unset.learningProgress = "";
    } else {
      $set.learningProgress = updates.learningProgress;
    }
  }

  if (updates.technologies !== undefined) {
    if (updates.technologies === null) {
      $set.technologies = [];
    } else {
      $set.technologies = updates.technologies;
    }
  }

  const updateOps: UpdateFilter<ProfileDocument> = { $set };
  if (Object.keys($unset).length > 0) {
    updateOps.$unset = $unset;
  }

  const updated = await profilesCollection().findOneAndUpdate(
    { _id: id },
    updateOps,
    { returnDocument: "after" }
  );

  if (!updated) {
    return null;
  }

  updated.learningProgress = mergeLegacyLearningProgress(
    updated.learningProgress
  );

  return updated;
}

export interface ProfileSearchFilters {
  technologyIds?: ObjectId[];
  location?: string;
  text?: string;
  minExperience?: number;
  maxExperience?: number;
  availability?: AvailabilityStatus[];
  limit: number;
  skip: number;
}

export async function searchProfiles({
  technologyIds,
  location,
  text,
  minExperience,
  maxExperience,
  availability,
  limit,
  skip,
}: ProfileSearchFilters): Promise<{
  items: ProfileDocument[];
  total: number;
}> {
  const filter: Filter<ProfileDocument> = {};

  if (technologyIds && technologyIds.length > 0) {
    filter.technologies = { $all: technologyIds };
  }

  if (availability && availability.length > 0) {
    filter.availability = { $in: availability };
  }

  if (location) {
    filter.location = {
      $regex: escapeRegex(location),
      $options: "i",
    };
  }

  if (text) {
    filter.$or = [
      { displayName: { $regex: escapeRegex(text), $options: "i" } },
      { headline: { $regex: escapeRegex(text), $options: "i" } },
    ];
  }

  if (minExperience !== undefined || maxExperience !== undefined) {
    const experience: FilterOperators<number> = {};
    if (minExperience !== undefined) {
      experience.$gte = minExperience;
    }
    if (maxExperience !== undefined) {
      experience.$lte = maxExperience;
    }

    filter.experienceYears = experience;
  }

  const cursor = profilesCollection()
    .find(filter)
    .sort({ recruitmentScore: -1, updatedAt: -1 })
    .skip(skip)
    .limit(limit);

  const [items, total] = await Promise.all([
    cursor.toArray(),
    profilesCollection().countDocuments(filter),
  ]);

  return { items, total };
}

function toObjectId(id: string | ObjectId): ObjectId {
  return typeof id === "string" ? new ObjectId(id) : id;
}

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyUpdateField(
  setTarget: Record<string, unknown>,
  unsetTarget: Record<string, "">,
  field: keyof ProfileDocument,
  value: unknown
) {
  if (value === undefined) {
    return;
  }

  if (value === null || value === "") {
    unsetTarget[field as string] = "";
    return;
  }

  setTarget[field as string] = value;
}

type LeaderboardAggregateRow = {
  _id: ObjectId;
  userId: ObjectId;
  displayName: string;
  netXp: number;
  baseXp: number;
  hintPenalty: number;
  completedTopics: number;
  learningProgress?: LearningProgressState;
  updatedAt: Date;
};

export async function getLearningLeaderboard({
  technologyId,
  limit,
}: {
  technologyId?: ObjectId;
  limit: number;
}): Promise<LeaderboardAggregateRow[]> {
  const pipeline: Document[] = [
    {
      $addFields: {
        netXp: { $ifNull: ["$learningProgress.totals.netXp", 0] },
        baseXp: { $ifNull: ["$learningProgress.totals.baseXp", 0] },
        hintPenalty: {
          $ifNull: ["$learningProgress.totals.hintPenalty", 0],
        },
        completedTopics: {
          $ifNull: ["$learningProgress.totals.completedTopics", 0],
        },
      },
    },
    {
      $match: {
        netXp: { $gt: 0 },
      },
    },
  ];

  if (technologyId) {
    pipeline.push({
      $match: {
        technologies: technologyId,
      },
    });
  }

  pipeline.push(
    {
      $sort: {
        netXp: -1,
        hintPenalty: 1,
        updatedAt: -1,
      },
    },
    {
      $limit: limit,
    },
    {
      $project: {
        displayName: 1,
        userId: 1,
        netXp: 1,
        baseXp: 1,
        hintPenalty: 1,
        completedTopics: 1,
        learningProgress: 1,
        updatedAt: 1,
      },
    }
  );

  const rows = await profilesCollection()
    .aggregate<LeaderboardAggregateRow>(pipeline)
    .toArray();

  for (const row of rows) {
    row.learningProgress = mergeLegacyLearningProgress(row.learningProgress);
  }

  return rows;
}
