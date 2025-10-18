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
          const coll = docs.profiles.slice();

          return {
            toArray: async () => {
              let items = coll.filter(
                (p) => (p.learningProgress?.totals?.netXp ?? 0) > 0
              );

              const techMatchStage = pipeline.find(
                (s) => s.$match && s.$match.technologies
              );

              if (techMatchStage) {
                const techId = techMatchStage.$match.technologies;
                items = items.filter((p) =>
                  Array.isArray(p.technologies)
                    ? p.technologies.some((id) =>
                        id instanceof ObjectId ? id.equals(techId) : false
                      )
                    : false
                );
              }

              const mapped = items.map((p) => ({
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

              const sortStage = pipeline.find((s) => s.$sort);
              if (sortStage) {
                const sortSpec = sortStage.$sort as Record<string, number>;
                mapped.sort((a, b) => {
                  for (const [field, direction] of Object.entries(sortSpec)) {
                    const aValue = (a as any)[field];
                    const bValue = (b as any)[field];

                    if (aValue === undefined || bValue === undefined) {
                      continue;
                    }

                    if (aValue > bValue) {
                      return direction > 0 ? 1 : -1;
                    }
                    if (aValue < bValue) {
                      return direction > 0 ? -1 : 1;
                    }
                  }
                  return 0;
                });
              }

              const limitStage = pipeline.find((s) => s.$limit);
              if (limitStage) {
                const limit = limitStage.$limit;
                return mapped.slice(0, limit);
              }

              return mapped;
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

  it("filters by technology id when provided", async () => {
    const techA = new ObjectId();
    const techB = new ObjectId();

    const profiles = [
      {
        _id: new ObjectId(),
        userId: new ObjectId(),
        displayName: "Alice",
        technologies: [techA],
        learningProgress: {
          totals: {
            netXp: 120,
            baseXp: 140,
            hintPenalty: 20,
            completedTopics: 4,
          },
        },
        updatedAt: new Date("2025-01-01T00:00:00.000Z"),
      },
      {
        _id: new ObjectId(),
        userId: new ObjectId(),
        displayName: "Bob",
        technologies: [techB],
        learningProgress: {
          totals: {
            netXp: 180,
            baseXp: 200,
            hintPenalty: 20,
            completedTopics: 5,
          },
        },
        updatedAt: new Date("2025-01-02T00:00:00.000Z"),
      },
    ];

    (db as any).__testHelpers.setProfiles(profiles);

    const res = await getLeaderboard({
      technologyId: techA.toHexString(),
      limit: 10,
    });

    expect(res.leaders).toHaveLength(1);
    expect(res.leaders[0].displayName).toBe("Alice");
  });

  it("respects limit and secondary sort criteria", async () => {
    const techId = new ObjectId();
    const now = Date.now();

    const profiles = [
      {
        _id: new ObjectId(),
        userId: new ObjectId(),
        displayName: "TopPenalty",
        technologies: [techId],
        learningProgress: {
          totals: {
            netXp: 200,
            baseXp: 220,
            hintPenalty: 20,
            completedTopics: 6,
          },
        },
        updatedAt: new Date(now - 1_000),
      },
      {
        _id: new ObjectId(),
        userId: new ObjectId(),
        displayName: "Best",
        technologies: [techId],
        learningProgress: {
          totals: {
            netXp: 200,
            baseXp: 220,
            hintPenalty: 5,
            completedTopics: 7,
          },
        },
        updatedAt: new Date(now),
      },
      {
        _id: new ObjectId(),
        userId: new ObjectId(),
        displayName: "LowerXp",
        technologies: [techId],
        learningProgress: {
          totals: {
            netXp: 150,
            baseXp: 160,
            hintPenalty: 10,
            completedTopics: 4,
          },
        },
        updatedAt: new Date(now - 2_000),
      },
    ];

    (db as any).__testHelpers.setProfiles(profiles);

    const res = await getLeaderboard({
      technologyId: techId.toHexString(),
      limit: 2,
    });

    expect(res.leaders).toHaveLength(2);
    expect(res.leaders[0].displayName).toBe("Best");
    expect(res.leaders[1].displayName).toBe("TopPenalty");
  });

  it("throws BadRequestError for invalid technology id", async () => {
    await expect(
      getLeaderboard({ technologyId: "not-an-objectid", limit: 10 })
    ).rejects.toThrow();
  });
});
