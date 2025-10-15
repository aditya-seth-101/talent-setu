import { ObjectId } from "mongodb";
import {
  createEmptyCourseProgress,
  createEmptyLevelProgress,
  createEmptyTopicProgress,
  recalculateLearningTotals,
  type CourseProgressState,
  type HintUsageState,
  type LearningProgressState,
  type LearningProgressTotals,
  
  type ProgressStatus,
  type TopicProgressState,
} from "../../models/learning-progress.model.js";
import {
  mapCourseToSummary,
  type CourseDocument,
  type PublicCourseSummary,
} from "../../models/course.model.js";
import {
  mapTopicToSummary,
  mapTopicToDetail,
  type PublicTopicDetail,
  type PublicTopicSummary,
  type TopicDocument,
} from "../../models/topic.model.js";
import {
  mapChallengeToPublic,
  type ChallengeDocument,
  type PublicChallenge,
} from "../../models/challenge.model.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../utils/http-errors.js";
import * as profileRepository from "../../repositories/profile.repository.js";
import * as courseRepository from "../../repositories/course.repository.js";
import * as topicRepository from "../../repositories/topic.repository.js";
import * as challengeRepository from "../../repositories/challenge.repository.js";
import * as judgeAttemptRepository from "../../repositories/judge-attempt.repository.js";
import { logger } from "../../config/logger.js";
import { env } from "../../config/env.js";

const XP_PER_TOPIC = 100;
const STATIC_HINT_PENALTY = 5;
const AI_HINT_PENALTY = 15;
const MAX_HINTS_PER_CHALLENGE = 3;
const HINT_COOLDOWN_MS = 60_000;

export interface TopicProgressView {
  status: ProgressStatus;
  unlockedAt?: string;
  completedAt?: string;
  attempts: number;
  hintsUsed: number;
  hintPenalty: number;
  remainingHints: number;
}

export interface LevelProgressView {
  name: string;
  status: ProgressStatus;
  unlockedAt?: string;
  completedAt?: string;
  topics: Array<{
    summary: PublicTopicSummary;
    progress: TopicProgressView;
  }>;
}

export interface CourseLearningView {
  course: PublicCourseSummary;
  levels: LevelProgressView[];
  totals: LearningProgressTotals;
}

export interface TopicLearningView {
  course: PublicCourseSummary;
  topic: PublicTopicDetail;
  gateChallengeId?: string;
  gateChallenge?: PublicChallenge;
  progress: TopicProgressView & {
    lastAttemptAt?: string;
    lockedReason?: string;
    gateChallengeId?: string;
  };
  prerequisites: Array<{
    id: string;
    title: string;
    status: ProgressStatus;
  }>;
  hintPolicy: {
    maxPerChallenge: number;
    cooldownSeconds: number;
    penaltyPerStatic: number;
    penaltyPerAi: number;
  };
}

export interface CompleteTopicInput {
  gateChallengeId?: string;
  attemptId?: string;
  passed: boolean;
  score?: number;
}

export interface HintRequestInput {
  attemptId?: string;
  code?: string;
  stdout?: string;
  stderr?: string;
  message?: string;
}

export interface HintResponse {
  hint: string;
  source: "static" | "ai";
  followUps: string[];
  penaltyApplied: number;
  remainingHints: number;
  progress: {
    hintsUsed: number;
    hintPenalty: number;
    netXp: number;
  };
}

type TopicGatingState = {
  levelUnlocked: boolean;
  prerequisitesMet: boolean;
  unmetPrerequisites: string[];
};

type EnforcedProgress = {
  courseProgress: CourseProgressState;
  topicStates: Record<string, TopicGatingState>;
  dirty: boolean;
};

export async function getCourseLearningView(
  userId: string,
  courseId: string
): Promise<CourseLearningView> {
  const {
    course,
    topics,
    challengesByTopic,
    learning,
    courseProgress,
  } = await loadLearningState(userId, courseId);

  const publicCourse = mapCourseToSummary(course, topics);
  const topicMap = topicsById(topics);
  const levels = course.levels.map((level) => {
    const levelProgress = courseProgress.levels[level.name];
    const items = level.topicIds.map((id) => {
      const key = id.toHexString();
      const topicDoc = topicMap.get(key);
      if (!topicDoc) {
        throw new NotFoundError("Topic not found for course level mapping");
      }
      const summary = mapTopicToSummary(
        topicDoc,
        challengesByTopic[key]?.length ?? 0
      );
      const topicProgress = levelProgress.topics[key];
      const usage = aggregateHintUsage(topicProgress);
      return {
        summary,
        progress: {
          status: topicProgress.status,
          unlockedAt: topicProgress.unlockedAt,
          completedAt: topicProgress.completedAt,
          attempts: topicProgress.attempts,
          hintsUsed: usage.count,
          hintPenalty: topicProgress.hintPenalty,
          remainingHints: remainingHintCount(topicProgress),
        },
      };
    });

    return {
      name: level.name,
      status: levelProgress.status,
      unlockedAt: levelProgress.unlockedAt,
      completedAt: levelProgress.completedAt,
      topics: items,
    } satisfies LevelProgressView;
  });

  const totals = learning.totals;

  return {
    course: publicCourse,
    levels,
    totals,
  };
}

export async function getTopicLearningView(
  userId: string,
  courseId: string,
  topicId: string
): Promise<TopicLearningView> {
  const {
    course,
    topics,
    challengesByTopic,
    courseProgress,
    gating,
  } = await loadLearningState(userId, courseId);

  const topicDoc = topics.find((topic) =>
    topic._id.equals(new ObjectId(topicId))
  );

  if (!topicDoc) {
    throw new NotFoundError("Topic not found for course");
  }

  const topicChallenges = challengesByTopic[topicDoc._id.toHexString()] ?? [];
  const topicDetail = mapTopicToDetail(
    topicDoc,
    topicChallenges.map(mapChallengeToPublic)
  );

  const defaultGate = resolveGateChallenge(topicChallenges);
  const levelProgress = courseProgress.levels[topicDoc.level];
  if (!levelProgress) {
    throw new NotFoundError("Level progress not found for topic");
  }

  const topicProgress = levelProgress.topics[topicDoc._id.toHexString()];
  if (!topicProgress) {
    throw new NotFoundError("Topic progress state missing");
  }
  const gatingState = gating.topicStates[topicDoc._id.toHexString()];

  const usage = aggregateHintUsage(topicProgress, defaultGate?._id);
  const lockedReason = computeLockedReason(topicProgress, gatingState);

  return {
    course: mapCourseToSummary(course, topics),
    topic: topicDetail,
    gateChallengeId:
      topicProgress.gateChallengeId ?? defaultGate?._id.toHexString(),
    gateChallenge: defaultGate ? mapChallengeToPublic(defaultGate) : undefined,
    progress: {
      status: topicProgress.status,
      unlockedAt: topicProgress.unlockedAt,
      completedAt: topicProgress.completedAt,
      attempts: topicProgress.attempts,
      hintsUsed: usage.count,
      hintPenalty: topicProgress.hintPenalty,
      remainingHints: remainingHintCount(topicProgress, defaultGate?._id),
      lastAttemptAt: topicProgress.lastAttemptAt,
      lockedReason,
      gateChallengeId:
        topicProgress.gateChallengeId ?? defaultGate?._id.toHexString(),
    },
    prerequisites: buildPrerequisiteView(topics, courseProgress, topicDoc),
    hintPolicy: {
      maxPerChallenge: MAX_HINTS_PER_CHALLENGE,
      cooldownSeconds: Math.floor(HINT_COOLDOWN_MS / 1000),
      penaltyPerStatic: STATIC_HINT_PENALTY,
      penaltyPerAi: AI_HINT_PENALTY,
    },
  };
}

export async function recordTopicGateResult(
  userId: string,
  topicId: string,
  payload: CompleteTopicInput
): Promise<CourseLearningView> {
  const topicObjectId = toObjectId(topicId);
  const topic = await topicRepository.findTopicById(topicObjectId);

  if (!topic) {
    throw new NotFoundError("Topic not found");
  }

  const courseId = topic.courseId.toHexString();
  const {
    course,
    topics,
    challengesByTopic,
    profile,
    learning,
    courseProgress,
    gating,
  } = await loadLearningState(userId, courseId);

  const gateChallenge = resolveGateChallengeForRequest(
    topic,
    challengesByTopic,
    payload.gateChallengeId
  );

  const levelProgress = courseProgress.levels[topic.level];
  if (!levelProgress) {
    throw new NotFoundError("Level progress not found for topic");
  }

  const topicProgress = levelProgress.topics[topic._id.toHexString()];
  if (!topicProgress) {
    throw new NotFoundError("Topic progress state missing");
  }
  const gatingState = gating.topicStates[topic._id.toHexString()];

  if (topicProgress.status === "locked") {
    throw new ForbiddenError("Topic is locked. Complete prerequisites first");
  }

  if (gatingState && !gatingState.prerequisitesMet) {
    throw new ForbiddenError(
      "Topic prerequisites are not complete. Complete required topics first"
    );
  }

  if (gateChallenge) {
    topicProgress.gateChallengeId = gateChallenge._id.toHexString();
  }

  const nowIso = new Date().toISOString();
  topicProgress.attempts += 1;
  topicProgress.lastAttemptAt = nowIso;

  if (gateChallenge) {
    const key = gateChallenge._id.toHexString();
    const attemptsForChallenge = topicProgress.attemptsByChallenge[key] ?? 0;
    topicProgress.attemptsByChallenge[key] = attemptsForChallenge + 1;
  }

  if (payload.attemptId) {
    await verifyAttemptOwnership(payload.attemptId, userId, gateChallenge);
  }

  if (payload.passed) {
    if (topicProgress.status !== "completed") {
      topicProgress.status = "completed";
      topicProgress.completedAt = nowIso;
      if (!topicProgress.awardedXp) {
        topicProgress.awardedXp = XP_PER_TOPIC;
        courseProgress.xp += XP_PER_TOPIC;
      }
    }
  } else if (topicProgress.status !== "completed") {
    topicProgress.status = "in-progress";
  }

  enforceProgress(course, topics, courseProgress);

  const dirty = true;

  if (dirty) {
    recalculateLearningTotals(learning);
    learning.lastUpdated = nowIso;
    await profileRepository.updateProfileById(profile._id, {
      learningProgress: learning,
    });
  }

  return getCourseLearningView(userId, courseId);
}

export async function requestHintForChallenge(
  userId: string,
  challengeId: string,
  payload: HintRequestInput
): Promise<HintResponse> {
  const challenge = await challengeRepository.findChallengeById(challengeId);

  if (!challenge) {
    throw new NotFoundError("Challenge not found");
  }

  const topic = await topicRepository.findTopicById(challenge.topicId);

  if (!topic) {
    throw new NotFoundError("Topic not found for challenge");
  }

  const course = await courseRepository.findCourseById(
    topic.courseId.toHexString()
  );

  if (!course) {
    throw new NotFoundError("Course not found for challenge");
  }

  if (course.status !== "published") {
    throw new ForbiddenError("Course is not yet available for learning");
  }

  const { profile, learning, courseProgress } =
    await loadLearningState(userId, course._id.toHexString());

  const levelProgress = courseProgress.levels[topic.level];
  if (!levelProgress) {
    throw new NotFoundError("Level progress not found for topic");
  }

  const topicProgress = levelProgress.topics[topic._id.toHexString()];
  if (!topicProgress) {
    throw new NotFoundError("Topic progress state missing");
  }

  if (topicProgress.status === "locked") {
    throw new ForbiddenError("Topic is locked. Complete prerequisites first");
  }

  const usage = ensureHintUsage(topicProgress, challenge._id.toHexString());
  const now = new Date();

  if (usage.count >= MAX_HINTS_PER_CHALLENGE) {
    throw new ForbiddenError(
      "Hint limit reached for this challenge. Revisit the lesson and try again"
    );
  }

  if (usage.lastRequestedAt) {
    const last = new Date(usage.lastRequestedAt);
    if (now.getTime() - last.getTime() < HINT_COOLDOWN_MS) {
      throw new ForbiddenError(
        "Please apply what you learned before requesting another hint"
      );
    }
  }

  let penaltyApplied = 0;
  let hintText: string;
  let followUps: string[] = [];
  let source: "static" | "ai" = "static";

  const staticHint = challenge.hints[usage.staticCursor];

  if (staticHint) {
    hintText = staticHint;
    usage.staticCursor += 1;
    penaltyApplied = STATIC_HINT_PENALTY;
  } else {
    const attempt = payload.attemptId
      ? await judgeAttemptRepository.findAttemptById(payload.attemptId)
      : null;

    if (attempt && attempt.userId.toHexString() !== userId) {
      throw new ForbiddenError("You can only request hints for your attempts");
    }

    const hintResult = await callAiForHint({
      course,
      topic,
      challenge,
      attempt,
      payload,
    });

    hintText = hintResult.hint;
    followUps = hintResult.followUps;
    source = "ai";
    penaltyApplied = AI_HINT_PENALTY;
  }

  usage.count += 1;
  usage.lastRequestedAt = now.toISOString();
  topicProgress.hintPenalty += penaltyApplied;
  courseProgress.hintPenalty += penaltyApplied;

  recalculateLearningTotals(learning);

  await profileRepository.updateProfileById(profile._id, {
    learningProgress: learning,
  });

  const hintsUsed = aggregateHintUsage(topicProgress, challenge._id).count;
  const remaining = remainingHintCount(topicProgress, challenge._id);

  return {
    hint: hintText,
    source,
    followUps,
    penaltyApplied,
    remainingHints: remaining,
    progress: {
      hintsUsed,
      hintPenalty: topicProgress.hintPenalty,
      netXp: learning.totals.netXp,
    },
  };
}

async function loadLearningState(
  userId: string,
  courseId: string
): Promise<{
  profile: NonNullable<Awaited<ReturnType<typeof profileRepository.findProfileByUserId>>>;
  course: CourseDocument;
  topics: TopicDocument[];
  challengesByTopic: Record<string, ChallengeDocument[]>;
  learning: LearningProgressState;
  courseProgress: CourseProgressState;
  gating: EnforcedProgress;
}> {
  const [profile, course] = await Promise.all([
    profileRepository.findProfileByUserId(userId),
    courseRepository.findCourseById(courseId),
  ]);

  if (!profile) {
    throw new NotFoundError("Profile not found");
  }

  if (!course) {
    throw new NotFoundError("Course not found");
  }

  if (course.status !== "published") {
    throw new ForbiddenError("Course is not yet available for learning");
  }

  const topics = await topicRepository.findTopicsByCourseId(course._id);
  const topicIds = topics.map((topic) => topic._id);
  const challengesByTopic = await challengeRepository.findChallengesByTopicIds(
    topicIds
  );

  const learning = profile.learningProgress;
  const { courseProgress, dirty } = ensureCourseProgress(
    learning,
    course,
    topics
  );
  const gating = enforceProgress(course, topics, courseProgress);

  if (dirty || gating.dirty) {
    recalculateLearningTotals(learning);
    await profileRepository.updateProfileById(profile._id, {
      learningProgress: learning,
    });
  }

  return {
    profile,
    course,
    topics,
    challengesByTopic,
    learning,
    courseProgress,
    gating,
  };
}

function ensureCourseProgress(
  learning: LearningProgressState,
  course: CourseDocument,
  topics: TopicDocument[]
): { courseProgress: CourseProgressState; dirty: boolean } {
  const key = course._id.toHexString();
  let dirty = false;

  if (!learning.courses[key]) {
    learning.courses[key] = createEmptyCourseProgress();
    learning.courses[key].status = "unlocked";
    learning.courses[key].unlockedAt = new Date().toISOString();
    dirty = true;
  }

  const courseProgress = learning.courses[key];

  for (const level of course.levels) {
    if (!courseProgress.levels[level.name]) {
      courseProgress.levels[level.name] = createEmptyLevelProgress();
      dirty = true;
    }

    const levelProgress = courseProgress.levels[level.name];

    for (const topicId of level.topicIds) {
      const topicKey = topicId.toHexString();
      if (!levelProgress.topics[topicKey]) {
        levelProgress.topics[topicKey] = createEmptyTopicProgress();
        dirty = true;
      }
    }
  }

  const topicKeys = new Set(topics.map((topic) => topic._id.toHexString()));

  for (const level of Object.values(courseProgress.levels)) {
    for (const topicKey of Object.keys(level.topics)) {
      if (!topicKeys.has(topicKey)) {
        delete level.topics[topicKey];
        dirty = true;
      }
    }
  }

  return { courseProgress, dirty };
}

function enforceProgress(
  course: CourseDocument,
  topics: TopicDocument[],
  courseProgress: CourseProgressState
): EnforcedProgress {
  const topicMap = topicsById(topics);
  const completedTopics = new Set<string>();
  const topicStates: Record<string, TopicGatingState> = {};
  let dirty = false;
  const nowIso = new Date().toISOString();
  const levelOrder = course.levels;

  for (const level of Object.values(courseProgress.levels)) {
    for (const [topicId, state] of Object.entries(level.topics)) {
      if (state.status === "completed") {
        completedTopics.add(topicId);
      }
    }
  }

  let previousLevelsComplete = true;

  for (const level of levelOrder) {
    const levelProgress = courseProgress.levels[level.name];
    const levelTopicIds = level.topicIds.map((id) => id.toHexString());
    const levelCompleted = levelTopicIds.every((id) => completedTopics.has(id));

    const levelUnlocked = previousLevelsComplete;

    if (levelCompleted) {
      if (levelProgress.status !== "completed") {
        levelProgress.status = "completed";
        levelProgress.completedAt ??= nowIso;
        dirty = true;
      }
    } else if (levelUnlocked) {
      if (levelProgress.status === "locked") {
        levelProgress.status = "unlocked";
        levelProgress.unlockedAt ??= nowIso;
        dirty = true;
      }
    } else if (levelProgress.status !== "locked") {
      levelProgress.status = "locked";
      dirty = true;
    }

    for (const topicId of levelTopicIds) {
      const topic = topicMap.get(topicId);
      if (!topic) {
        continue;
      }

      const progress = levelProgress.topics[topicId];
      const prerequisites = topic.prerequisites.map((id) => id.toHexString());
      const unmet = prerequisites.filter((id) => !completedTopics.has(id));
      const prerequisitesMet = unmet.length === 0;

      topicStates[topicId] = {
        levelUnlocked,
        prerequisitesMet,
        unmetPrerequisites: unmet,
      };

      if (progress.status === "completed") {
        continue;
      }

      if (levelUnlocked && prerequisitesMet) {
        if (progress.status === "locked") {
          progress.status = "unlocked";
          progress.unlockedAt ??= nowIso;
          dirty = true;
        }
      } else if (progress.status !== "locked") {
        progress.status = "locked";
        dirty = true;
      }
    }

    previousLevelsComplete = previousLevelsComplete && levelCompleted;
  }

  const allLevelsCompleted = levelOrder.every((level) => {
    return courseProgress.levels[level.name]?.status === "completed";
  });

  if (allLevelsCompleted) {
    if (courseProgress.status !== "completed") {
      courseProgress.status = "completed";
      courseProgress.completedAt ??= nowIso;
      dirty = true;
    }
  } else {
    const anyUnlocked = levelOrder.some((level) => {
      const status = courseProgress.levels[level.name]?.status;
      return status && status !== "locked";
    });

    if (anyUnlocked) {
      if (courseProgress.status === "locked") {
        courseProgress.status = "in-progress";
        courseProgress.unlockedAt ??= nowIso;
        dirty = true;
      }
    } else if (courseProgress.status !== "locked") {
      courseProgress.status = "locked";
      dirty = true;
    }
  }

  courseProgress.updatedAt = nowIso;

  return { courseProgress, topicStates, dirty };
}

function topicsById(topics: TopicDocument[]): Map<string, TopicDocument> {
  const map = new Map<string, TopicDocument>();
  for (const topic of topics) {
    map.set(topic._id.toHexString(), topic);
  }
  return map;
}

function aggregateHintUsage(
  topicProgress: TopicProgressState,
  challengeId?: ObjectId
): { count: number } {
  if (!challengeId) {
    let total = 0;
    for (const usage of Object.values(topicProgress.hints)) {
      total += usage.count;
    }
    return { count: total };
  }

  const usage = topicProgress.hints[challengeId.toHexString()];
  return { count: usage ? usage.count : 0 };
}

function remainingHintCount(
  topicProgress: TopicProgressState,
  challengeId?: ObjectId
): number {
  const usage = challengeId
    ? topicProgress.hints[challengeId.toHexString()]
    : undefined;
  const count = usage ? usage.count : aggregateHintUsage(topicProgress).count;
  return Math.max(0, MAX_HINTS_PER_CHALLENGE - count);
}

function resolveGateChallenge(
  challenges: ChallengeDocument[]
): ChallengeDocument | undefined {
  return (
    challenges.find(
      (challenge) => challenge.type === "coding" || challenge.type === "debug"
    ) ?? challenges[0]
  );
}

function resolveGateChallengeForRequest(
  topic: TopicDocument,
  challengesByTopic: Record<string, ChallengeDocument[]>,
  challengeId?: string
): ChallengeDocument | undefined {
  const candidates = challengesByTopic[topic._id.toHexString()] ?? [];

  if (challengeId) {
    const match = candidates.find((challenge) =>
      challenge._id.equals(new ObjectId(challengeId))
    );
    if (!match) {
      throw new BadRequestError("Gate challenge does not belong to this topic");
    }
    return match;
  }

  return resolveGateChallenge(candidates);
}

function ensureHintUsage(
  topicProgress: TopicProgressState,
  challengeKey: string
): HintUsageState {
  if (!topicProgress.hints[challengeKey]) {
    topicProgress.hints[challengeKey] = {
      count: 0,
      staticCursor: 0,
    };
  }

  return topicProgress.hints[challengeKey];
}

function computeLockedReason(
  progress: TopicProgressState,
  gatingState?: TopicGatingState
): string | undefined {
  if (progress.status !== "locked") {
    return undefined;
  }

  if (!gatingState) {
    return "This topic is currently unavailable.";
  }

  if (!gatingState.levelUnlocked) {
    return "Complete previous levels to unlock this topic.";
  }

  if (!gatingState.prerequisitesMet) {
    return "Complete prerequisite topics first.";
  }

  return undefined;
}

function buildPrerequisiteView(
  topics: TopicDocument[],
  courseProgress: CourseProgressState,
  target: TopicDocument
): Array<{ id: string; title: string; status: ProgressStatus }> {
  if (!target.prerequisites.length) {
    return [];
  }

  const topicMap = topicsById(topics);
  const result: Array<{ id: string; title: string; status: ProgressStatus }> =
    [];

  for (const prereq of target.prerequisites) {
    const prereqId = prereq.toHexString();
    const topic = topicMap.get(prereqId);
    if (!topic) continue;

    const levelProgress = courseProgress.levels[topic.level];
    const topicProgress = levelProgress.topics[prereqId];
    result.push({
      id: prereqId,
      title: topic.title,
      status: topicProgress.status,
    });
  }

  return result;
}

async function verifyAttemptOwnership(
  attemptId: string,
  userId: string,
  challenge?: ChallengeDocument
) {
  const attempt = await judgeAttemptRepository.findAttemptById(attemptId);
  if (!attempt) {
    throw new NotFoundError("Judge attempt not found");
  }

  if (attempt.userId.toHexString() !== userId) {
    throw new ForbiddenError("You can only submit your own attempts");
  }

  if (
    challenge &&
    attempt.challengeId &&
    attempt.challengeId !== challenge._id.toHexString()
  ) {
    throw new ForbiddenError("Attempt does not match the gate challenge");
  }
}

type AiHintPayload = {
  course: CourseDocument;
  topic: TopicDocument;
  challenge: ChallengeDocument;
  attempt: Awaited<
    ReturnType<typeof judgeAttemptRepository.findAttemptById>
  > | null;
  payload: HintRequestInput;
};

async function callAiForHint({
  course,
  topic,
  challenge,
  attempt,
  payload,
}: AiHintPayload): Promise<{ hint: string; followUps: string[] }> {
  const endpoint = `${env.AI_SERVICE_URL}/learning/hints`;

  const data = {
    course: {
      title: course.title,
      languageKey: course.languageKey,
    },
    topic: {
      title: topic.title,
      description: topic.description,
    },
    challenge: {
      type: challenge.type,
      difficulty: challenge.difficulty,
      prompt: challenge.prompt,
    },
    attempt: {
      attemptId: attempt?._id.toHexString() ?? payload.attemptId,
      sourceCode: attempt?.sourceCode ?? payload.code,
      stdout:
        (attempt?.result as Record<string, unknown> | undefined)?.stdout ??
        payload.stdout,
      stderr:
        (attempt?.result as Record<string, unknown> | undefined)?.stderr ??
        payload.stderr,
      message:
        (attempt?.result as Record<string, unknown> | undefined)?.message ??
        payload.message,
    },
  };

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to reach AI hint endpoint");
    throw new BadRequestError("Unable to reach AI hint service");
  }

  if (!response.ok) {
    const text = await safeReadText(response);
    logger.warn(
      {
        status: response.status,
        endpoint,
        body: text,
      },
      "AI hint endpoint returned an error"
    );
    throw new BadRequestError("AI service could not generate a hint");
  }

  const result = (await response.json()) as {
    hint: string;
    followUps?: string[];
  };

  return {
    hint: result.hint,
    followUps: result.followUps ?? [],
  };
}

async function safeReadText(response: Response): Promise<string | undefined> {
  try {
    return await response.text();
  } catch (error) {
    logger.warn({ err: error }, "Failed to read response body");
    return undefined;
  }
}

function toObjectId(id: string): ObjectId {
  try {
    return new ObjectId(id);
  } catch {
    throw new BadRequestError("Invalid identifier format");
  }
}
