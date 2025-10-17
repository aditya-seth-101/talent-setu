import type { ObjectId } from "mongodb";

export type AssessmentTemplateStatus = "draft" | "published";

export type AssessmentPhaseType = "voice" | "coding" | "debug" | "mcq";

export type AssessmentDifficulty = "beginner" | "intermediate" | "advanced";

export interface AssessmentPhaseAiConfig {
  difficulty?: AssessmentDifficulty;
  languageKey?: string;
  focusAreas?: string[];
  rubric?: string[];
  expectedDurationMinutes?: number;
  promptContext?: string;
  referenceMaterials?: string[];
}

export interface AssessmentTemplatePhase {
  id: string;
  type: AssessmentPhaseType;
  title: string;
  instructions?: string;
  weight: number;
  durationMinutes?: number;
  aiConfig?: AssessmentPhaseAiConfig;
}

export interface AssessmentTemplateDocument {
  _id: ObjectId;
  name: string;
  description?: string;
  createdBy: ObjectId;
  techStack: ObjectId[];
  durationMinutes: number;
  phases: AssessmentTemplatePhase[];
  status: AssessmentTemplateStatus;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface CreateAssessmentTemplateInput {
  name: string;
  description?: string;
  createdBy: ObjectId;
  techStack: ObjectId[];
  durationMinutes: number;
  phases: AssessmentTemplatePhase[];
  status?: AssessmentTemplateStatus;
  publishedAt?: Date;
}

export interface UpdateAssessmentTemplateInput {
  name?: string;
  description?: string | null;
  techStack?: ObjectId[];
  durationMinutes?: number;
  phases?: AssessmentTemplatePhase[];
  status?: AssessmentTemplateStatus;
  publishedAt?: Date | null;
}

export type PublicAssessmentTemplate = {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  techStack: string[];
  durationMinutes: number;
  phases: PublicAssessmentTemplatePhase[];
  status: AssessmentTemplateStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

export type PublicAssessmentTemplatePhase = {
  id: string;
  type: AssessmentPhaseType;
  title: string;
  instructions?: string;
  weight: number;
  durationMinutes?: number;
  aiConfig?: AssessmentPhaseAiConfig;
};

export function mapAssessmentTemplateToPublic(
  template: AssessmentTemplateDocument
): PublicAssessmentTemplate {
  return {
    id: template._id.toHexString(),
    name: template.name,
    description: template.description,
    createdBy: template.createdBy.toHexString(),
    techStack: template.techStack.map((tech) => tech.toHexString()),
    durationMinutes: template.durationMinutes,
    phases: template.phases.map(mapAssessmentTemplatePhaseToPublic),
    status: template.status,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
    publishedAt: template.publishedAt?.toISOString(),
  };
}

export function mapAssessmentTemplatePhaseToPublic(
  phase: AssessmentTemplatePhase
): PublicAssessmentTemplatePhase {
  return {
    id: phase.id,
    type: phase.type,
    title: phase.title,
    instructions: phase.instructions,
    weight: phase.weight,
    durationMinutes: phase.durationMinutes,
    aiConfig: phase.aiConfig,
  };
}
