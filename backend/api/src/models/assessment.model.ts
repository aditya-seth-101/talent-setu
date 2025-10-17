import type { ObjectId } from "mongodb";
import type {
  AssessmentPhaseAiConfig,
  AssessmentPhaseType,
} from "./assessment-template.model.js";

export type AssessmentStatus =
  | "scheduled"
  | "in-progress"
  | "completed"
  | "cancelled";

export type AssessmentPhaseStatus =
  | "pending"
  | "active"
  | "completed"
  | "skipped";

export interface AssessmentCandidateSnapshot {
  userId: ObjectId;
  displayName: string;
  headline?: string;
  experienceYears?: number;
  technologies: ObjectId[];
}

export interface AssessmentPhaseContent {
  prompt: string;
  summary?: string;
  starterCode?: string;
  starterFiles?: Array<{
    filename: string;
    contents: string;
  }>;
  testCases?: Array<{
    stdin?: string;
    expectedOutput?: string;
    description?: string;
    weight?: number;
  }>;
  mcqs?: Array<{
    question: string;
    options: string[];
    answerIndex?: number;
    explanation?: string;
  }>;
  voiceScript?: {
    opener: string;
    followUps: string[];
    closing?: string;
  };
  rubric?: string[];
  hints?: string[];
  evaluationNotes?: string[];
  additional?: Record<string, unknown>;
}

export interface AssessmentPhaseEvaluation {
  score?: number;
  maxScore?: number;
  rubricNotes?: Array<{ criterion: string; score?: number; notes?: string }>;
  reviewerId?: ObjectId;
  completedAt?: Date;
  summary?: string;
  recommendation?: string;
}

export interface PublicAssessmentPhaseEvaluation {
  score?: number;
  maxScore?: number;
  rubricNotes?: Array<{ criterion: string; score?: number; notes?: string }>;
  reviewerId?: string;
  completedAt?: string;
  summary?: string;
  recommendation?: string;
}

export interface AssessmentTranscriptSegment {
  at: string;
  speaker: "candidate" | "system" | "assistant";
  text: string;
}

export interface AssessmentPhaseInstance {
  id: string;
  templatePhaseId: string;
  type: AssessmentPhaseType;
  title: string;
  instructions?: string;
  status: AssessmentPhaseStatus;
  weight: number;
  durationMinutes?: number;
  aiSeed: string;
  aiConfig?: AssessmentPhaseAiConfig;
  content: AssessmentPhaseContent;
  attemptIds: string[];
  transcript?: string;
  transcriptSegments?: AssessmentTranscriptSegment[];
  startedAt?: Date;
  completedAt?: Date;
  evaluation?: AssessmentPhaseEvaluation;
}

export interface AssessmentDocument {
  _id: ObjectId;
  templateId: ObjectId;
  recruiterId: ObjectId;
  candidateId: ObjectId;
  techStack: ObjectId[];
  durationMinutes: number;
  status: AssessmentStatus;
  uniqueSeed: string;
  kioskFlag: boolean;
  phases: AssessmentPhaseInstance[];
  candidateSnapshot: AssessmentCandidateSnapshot;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface CreateAssessmentInput {
  templateId: ObjectId;
  recruiterId: ObjectId;
  candidateId: ObjectId;
  techStack: ObjectId[];
  durationMinutes: number;
  phases: AssessmentPhaseInstance[];
  uniqueSeed: string;
  kioskFlag?: boolean;
  candidateSnapshot: AssessmentCandidateSnapshot;
  status?: AssessmentStatus;
  startedAt?: Date;
  completedAt?: Date;
}

export interface UpdateAssessmentInput {
  status?: AssessmentStatus;
  phases?: AssessmentPhaseInstance[];
  kioskFlag?: boolean;
  startedAt?: Date | null;
  completedAt?: Date | null;
  durationMinutes?: number;
}

export type PublicAssessment = {
  id: string;
  templateId: string;
  recruiterId: string;
  candidateId: string;
  techStack: string[];
  durationMinutes: number;
  status: AssessmentStatus;
  uniqueSeed: string;
  kioskFlag: boolean;
  phases: PublicAssessmentPhase[];
  candidate: {
    userId: string;
    displayName: string;
    headline?: string;
    experienceYears?: number;
    technologies: string[];
  };
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
};

export type PublicAssessmentPhase = {
  id: string;
  templatePhaseId: string;
  type: AssessmentPhaseType;
  title: string;
  instructions?: string;
  status: AssessmentPhaseStatus;
  weight: number;
  durationMinutes?: number;
  content: AssessmentPhaseContent;
  attemptIds: string[];
  transcript?: string;
  transcriptSegments?: AssessmentTranscriptSegment[];
  startedAt?: string;
  completedAt?: string;
  evaluation?: PublicAssessmentPhaseEvaluation;
};

export interface MapAssessmentOptions {
  includeSolutions?: boolean;
}

export function mapAssessmentToPublic(
  assessment: AssessmentDocument,
  options: MapAssessmentOptions = {}
): PublicAssessment {
  return {
    id: assessment._id.toHexString(),
    templateId: assessment.templateId.toHexString(),
    recruiterId: assessment.recruiterId.toHexString(),
    candidateId: assessment.candidateId.toHexString(),
    techStack: assessment.techStack.map((tech) => tech.toHexString()),
    durationMinutes: assessment.durationMinutes,
    status: assessment.status,
    uniqueSeed: assessment.uniqueSeed,
    kioskFlag: assessment.kioskFlag,
    phases: assessment.phases.map((phase) =>
      mapAssessmentPhaseToPublic(phase, options)
    ),
    candidate: {
      userId: assessment.candidateSnapshot.userId.toHexString(),
      displayName: assessment.candidateSnapshot.displayName,
      headline: assessment.candidateSnapshot.headline,
      experienceYears: assessment.candidateSnapshot.experienceYears,
      technologies: assessment.candidateSnapshot.technologies.map((id) =>
        id.toHexString()
      ),
    },
    createdAt: assessment.createdAt.toISOString(),
    updatedAt: assessment.updatedAt.toISOString(),
    startedAt: assessment.startedAt?.toISOString(),
    completedAt: assessment.completedAt?.toISOString(),
  };
}

export function mapAssessmentPhaseToPublic(
  phase: AssessmentPhaseInstance,
  options: MapAssessmentOptions
): PublicAssessmentPhase {
  return {
    id: phase.id,
    templatePhaseId: phase.templatePhaseId,
    type: phase.type,
    title: phase.title,
    instructions: phase.instructions,
    status: phase.status,
    weight: phase.weight,
    durationMinutes: phase.durationMinutes,
    content: scrubPhaseContentForAudience(phase.content, options),
    attemptIds: [...phase.attemptIds],
    transcript: phase.transcript,
    transcriptSegments: phase.transcriptSegments,
    startedAt: phase.startedAt?.toISOString(),
    completedAt: phase.completedAt?.toISOString(),
    evaluation: phase.evaluation
      ? {
          score: phase.evaluation.score,
          maxScore: phase.evaluation.maxScore,
          rubricNotes: phase.evaluation.rubricNotes,
          reviewerId: phase.evaluation.reviewerId?.toHexString(),
          completedAt: phase.evaluation.completedAt?.toISOString(),
          summary: phase.evaluation.summary,
          recommendation: phase.evaluation.recommendation,
        }
      : undefined,
  };
}

function scrubPhaseContentForAudience(
  content: AssessmentPhaseContent,
  options: MapAssessmentOptions
): AssessmentPhaseContent {
  if (options.includeSolutions) {
    return content;
  }

  const scrubbed: AssessmentPhaseContent = { ...content };

  if (scrubbed.mcqs) {
    scrubbed.mcqs = scrubbed.mcqs.map((item) => ({
      question: item.question,
      options: item.options,
      explanation: item.explanation,
    }));
  }

  if (scrubbed.additional) {
    const cleaned = { ...scrubbed.additional };
    if ("answers" in cleaned) {
      delete cleaned.answers;
    }
    scrubbed.additional = cleaned;
  }

  return scrubbed;
}
