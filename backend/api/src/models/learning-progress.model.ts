import type { ObjectId } from "mongodb";

export type ProgressStatus =
  | "locked"
  | "unlocked"
  | "in-progress"
  | "completed";

export interface HintUsageState {
  count: number;
  staticCursor: number;
  lastRequestedAt?: string;
}

export interface TopicProgressState {
  status: ProgressStatus;
  gateChallengeId?: string;
  unlockedAt?: string;
  completedAt?: string;
  lastAttemptAt?: string;
  attempts: number;
  attemptsByChallenge: Record<string, number>;
  hints: Record<string, HintUsageState>;
  hintPenalty: number;
  awardedXp?: number;
}

export interface LevelProgressState {
  status: ProgressStatus;
  unlockedAt?: string;
  completedAt?: string;
  topics: Record<string, TopicProgressState>;
}

export interface CourseProgressState {
  status: ProgressStatus;
  unlockedAt?: string;
  completedAt?: string;
  levels: Record<string, LevelProgressState>;
  xp: number;
  hintPenalty: number;
  updatedAt: string;
}

export interface LearningProgressTotals {
  baseXp: number;
  hintPenalty: number;
  netXp: number;
  completedTopics: number;
}

export interface LearningProgressState {
  courses: Record<string, CourseProgressState>;
  totals: LearningProgressTotals;
  lastUpdated?: string;
}

export function createEmptyLearningProgress(): LearningProgressState {
  const now = new Date().toISOString();
  return {
    courses: {},
    totals: {
      baseXp: 0,
      hintPenalty: 0,
      netXp: 0,
      completedTopics: 0,
    },
    lastUpdated: now,
  };
}

export function createEmptyCourseProgress(): CourseProgressState {
  const now = new Date().toISOString();
  return {
    status: "locked",
    levels: {},
    xp: 0,
    hintPenalty: 0,
    updatedAt: now,
  };
}

export function createEmptyLevelProgress(): LevelProgressState {
  return {
    status: "locked",
    topics: {},
  };
}

export function createEmptyTopicProgress(): TopicProgressState {
  return {
    status: "locked",
    attempts: 0,
    attemptsByChallenge: {},
    hints: {},
    hintPenalty: 0,
  };
}

export function recalculateLearningTotals(progress: LearningProgressState) {
  let baseXp = 0;
  let hintPenalty = 0;
  let completedTopics = 0;

  for (const course of Object.values(progress.courses)) {
    baseXp += course.xp;
    hintPenalty += course.hintPenalty;

    for (const level of Object.values(course.levels)) {
      for (const topic of Object.values(level.topics)) {
        if (topic.status === "completed") {
          completedTopics += 1;
        }
      }
    }
  }

  progress.totals = {
    baseXp,
    hintPenalty,
    netXp: Math.max(0, baseXp - hintPenalty),
    completedTopics,
  };
  progress.lastUpdated = new Date().toISOString();
}

type LearningProgressLike = LearningProgressState | undefined;

export function isLearningProgress(
  value: unknown
): value is LearningProgressState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as LearningProgressLike;
  return (
    typeof candidate?.courses === "object" &&
    typeof candidate?.totals === "object"
  );
}

export function mergeLegacyLearningProgress(
  value: unknown
): LearningProgressState {
  if (isLearningProgress(value)) {
    return value;
  }

  return createEmptyLearningProgress();
}

export function stringifyObjectId(id: ObjectId | string): string {
  return typeof id === "string" ? id : id.toHexString();
}
