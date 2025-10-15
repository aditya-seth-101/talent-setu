import { ObjectId } from "mongodb";
import * as profileRepository from "../../repositories/profile.repository.js";
import { BadRequestError } from "../../utils/http-errors.js";

export interface LeaderboardEntry {
  profileId: string;
  displayName: string;
  netXp: number;
  baseXp: number;
  hintPenalty: number;
  completedTopics: number;
  updatedAt: string;
}

export interface LeaderboardResponse {
  leaders: LeaderboardEntry[];
  updatedAt: string;
}

export async function getLeaderboard({
  technologyId,
  limit = 10,
}: {
  technologyId?: string;
  limit?: number;
}): Promise<LeaderboardResponse> {
  const boundedLimit = Math.min(Math.max(limit, 1), 50);
  let technologyObjectId: ObjectId | undefined;

  if (technologyId) {
    try {
      technologyObjectId = new ObjectId(technologyId);
    } catch {
      throw new BadRequestError("Invalid technology identifier");
    }
  }

  const rows = await profileRepository.getLearningLeaderboard({
    technologyId: technologyObjectId,
    limit: boundedLimit,
  });

  const leaders: LeaderboardEntry[] = rows.map((row) => ({
    profileId: row._id.toHexString(),
    displayName: row.displayName,
    netXp: row.netXp,
    baseXp: row.baseXp,
    hintPenalty: row.hintPenalty,
    completedTopics: row.completedTopics,
    updatedAt: row.updatedAt.toISOString(),
  }));

  return {
    leaders,
    updatedAt: new Date().toISOString(),
  };
}
