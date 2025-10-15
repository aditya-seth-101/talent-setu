import type { ObjectId } from "mongodb";

export type ChallengeType = "mcq" | "coding" | "debug";

type Judge0ExecutionLimit = {
  timeLimitMs?: number;
  memoryLimitKb?: number;
};

export interface Judge0Spec {
  languageId: number;
  stdin?: string;
  expectedOutput?: string;
  additionalFiles?: string[];
  execution?: Judge0ExecutionLimit;
}

export interface ChallengeDocument {
  _id: ObjectId;
  topicId: ObjectId;
  type: ChallengeType;
  difficulty: "beginner" | "intermediate" | "advanced";
  prompt: string;
  judge0Spec?: Judge0Spec;
  mcq?: {
    question: string;
    options: string[];
    answerIndex: number;
  };
  debugContext?: {
    buggySnippet: string;
    guidance?: string;
  };
  hints: string[];
  solutionHash?: string;
  randomizeSeed?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateChallengeInput {
  topicId: ObjectId;
  type: ChallengeType;
  difficulty: "beginner" | "intermediate" | "advanced";
  prompt: string;
  judge0Spec?: Judge0Spec;
  mcq?: {
    question: string;
    options: string[];
    answerIndex: number;
  };
  debugContext?: {
    buggySnippet: string;
    guidance?: string;
  };
  hints?: string[];
  solutionHash?: string;
  randomizeSeed?: string;
}

export interface UpdateChallengeInput {
  prompt?: string;
  judge0Spec?: Judge0Spec | null;
  mcq?: {
    question: string;
    options: string[];
    answerIndex: number;
  } | null;
  debugContext?: {
    buggySnippet: string;
    guidance?: string;
  } | null;
  hints?: string[];
  solutionHash?: string | null;
  randomizeSeed?: string | null;
}

export type PublicChallenge = {
  id: string;
  topicId: string;
  type: ChallengeType;
  difficulty: "beginner" | "intermediate" | "advanced";
  prompt: string;
  judge0Spec?: Judge0Spec;
  mcq?: {
    question: string;
    options: string[];
  };
  debugContext?: {
    buggySnippet: string;
    guidance?: string;
  };
  hints: string[];
  solutionHash?: string;
  randomizeSeed?: string;
};

export function mapChallengeToPublic(
  challenge: ChallengeDocument
): PublicChallenge {
  return {
    id: challenge._id.toHexString(),
    topicId: challenge.topicId.toHexString(),
    type: challenge.type,
    difficulty: challenge.difficulty,
    prompt: challenge.prompt,
    judge0Spec: challenge.judge0Spec,
    mcq: challenge.mcq
      ? {
          question: challenge.mcq.question,
          options: [...challenge.mcq.options],
        }
      : undefined,
    debugContext: challenge.debugContext,
    hints: challenge.hints ?? [],
    solutionHash: challenge.solutionHash,
    randomizeSeed: challenge.randomizeSeed,
  };
}
