import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";

// stub the database service module
vi.mock("../src/services/database.ts", () => {
  const docs: Record<string, any[]> = {
    profiles: [],
  };

  return {
    getDb: () => ({} as any),
    getCollection: (name: string) => {
      return {
        aggregate: (pipeline: any[]) => {
          // simple aggregator: return whatever is in docs.profiles filtered by pipeline match on technologies
          const coll = docs.profiles.slice();
          return {
            toArray: async () => {
              // if pipeline contains a $match with technologies: ObjectId, filter
              const techMatchStage = pipeline.find(
                (s) => s.$match && s.$match.technologies
              );
              if (techMatchStage) {
                const techId = techMatchStage.$match.technologies;
                return coll.filter(
                  (p) =>
                    p.technologies &&
                    p.technologies.toString() === techId.toString()
                );
              }

              // default: return those with netXp > 0
              return coll
                .filter((p) => (p.learningProgress?.totals?.netXp ?? 0) > 0)
                .map((p) => ({
                  _id: p._id,
                  userId: p.userId,
                  displayName: p.displayName,
                  netXp: p.learningProgress?.totals?.netXp ?? 0,
                  baseXp: p.learningProgress?.totals?.baseXp ?? 0,
                  hintPenalty: p.learningProgress?.totals?.hintPenalty ?? 0,
                  completedTopics:
                    p.learningProgress?.totals?.completedTopics ?? 0,
                  learningProgress: p.learningProgress,
                  updatedAt: p.updatedAt ?? new Date(),
                }));
            },
          };
        },
      } as any;
    },
    // helpers for tests to populate data
    __testHelpers: {
      setProfiles: (items: any[]) => {
        docs.profiles = items;
      },
    },
  };
});

import * as db from "../src/services/database";
import * as profileRepository from "../src/repositories/profile.repository";
import { getLeaderboard } from "../src/services/learning/leaderboard.service";

describe("leaderboard.getLeaderboard", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns leaders for happy path", async () => {
    const p1 = {
      _id: new ObjectId(),
      userId: new ObjectId(),
      displayName: "Alice",
      technologies: [new ObjectId()],
      learningProgress: {
        totals: { netXp: 150, baseXp: 150, hintPenalty: 0, completedTopics: 3 },
      },
      updatedAt: new Date(),
    };

    // set profiles in mocked db
    (db as any).__testHelpers.setProfiles([p1]);

    const res = await getLeaderboard({ limit: 10 });
    expect(res.leaders.length).toBeGreaterThan(0);
    expect(res.leaders[0].displayName).toBe("Alice");
  });

  it("throws BadRequestError for invalid technology id", async () => {
    await expect(
      getLeaderboard({ technologyId: "not-an-objectid", limit: 10 })
    ).rejects.toThrow();
  });
});
