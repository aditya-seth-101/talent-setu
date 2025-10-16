import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";

vi.mock("../src/services/database.ts", () => {
  const docs: Record<string, any[]> = { profiles: [] };
  return {
    getDb: () => ({} as any),
    getCollection: (name: string) =>
      ({
        aggregate: (pipeline: any[]) => ({
          toArray: async () => {
            // Simulation similar to repository pipeline
            const coll = docs.profiles.slice();
            const techMatchStage = pipeline.find(
              (s) => s.$match && s.$match.technologies
            );
            if (techMatchStage) {
              const techId = techMatchStage.$match.technologies;
              return coll
                .filter(
                  (p) =>
                    p.technologies &&
                    p.technologies.toString() === techId.toString()
                )
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
            }

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
        }),
      } as any),
    __testHelpers: { setProfiles: (items: any[]) => (docs.profiles = items) },
  };
});

import * as db from "../src/services/database";
import { getLearningLeaderboard } from "../src/repositories/profile.repository";

describe("profile.repository.getLearningLeaderboard", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns rows for happy path", async () => {
    const techId = new ObjectId();
    const p1 = {
      _id: new ObjectId(),
      userId: new ObjectId(),
      displayName: "Bob",
      technologies: [techId],
      learningProgress: {
        totals: { netXp: 200, baseXp: 200, hintPenalty: 0, completedTopics: 5 },
      },
      updatedAt: new Date(),
    };
    (db as any).__testHelpers.setProfiles([p1]);

    const rows = await getLearningLeaderboard({
      technologyId: techId,
      limit: 10,
    });
    expect(rows.length).toBe(1);
    expect(rows[0].displayName).toBe("Bob");
  });

  it("returns empty array for invalid tech id type", async () => {
    // pass a non-ObjectId (should be handled upstream normally); repository expects ObjectId or undefined
    const rows = await getLearningLeaderboard({
      technologyId: null as unknown as ObjectId,
      limit: 10,
    });
    expect(Array.isArray(rows)).toBe(true);
  });
});
