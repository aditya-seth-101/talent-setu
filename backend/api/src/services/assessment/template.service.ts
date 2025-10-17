import { randomUUID } from "crypto";
import { ObjectId } from "mongodb";
import {
  type AssessmentPhaseAiConfig,
  type AssessmentPhaseType,
  type AssessmentTemplatePhase,
  mapAssessmentTemplateToPublic,
  type PublicAssessmentTemplate,
} from "../../models/assessment-template.model.js";
import { BadRequestError, NotFoundError } from "../../utils/http-errors.js";
import * as assessmentTemplateRepository from "../../repositories/assessment-template.repository.js";
import * as technologyRepository from "../../repositories/technology.repository.js";

type CreateTemplatePhaseInput = {
  id?: string;
  type: AssessmentPhaseType;
  title: string;
  instructions?: string;
  weight: number;
  durationMinutes?: number;
  aiConfig?: AssessmentPhaseAiConfig;
};

export interface CreateAssessmentTemplatePayload {
  name: string;
  description?: string;
  techStack: string[];
  durationMinutes: number;
  phases: CreateTemplatePhaseInput[];
}

export async function createTemplate(
  creatorId: string,
  payload: CreateAssessmentTemplatePayload
): Promise<PublicAssessmentTemplate> {
  if (!payload.phases.length) {
    throw new BadRequestError("Template must include at least one phase");
  }

  const creatorObjectId = toObjectId(creatorId, "Invalid creator id");
  const techObjectIds = payload.techStack.map((id) =>
    toObjectId(id, "Invalid technology id")
  );

  const technologies = await technologyRepository.findTechnologiesByIds(
    techObjectIds
  );

  if (technologies.length !== techObjectIds.length) {
    throw new BadRequestError(
      "One or more technologies referenced in the template do not exist"
    );
  }

  const normalizedPhases = normalizeTemplatePhases(payload.phases);

  const template = await assessmentTemplateRepository.createTemplate({
    name: payload.name.trim(),
    description: payload.description?.trim() || undefined,
    createdBy: creatorObjectId,
    techStack: techObjectIds,
    durationMinutes: payload.durationMinutes,
    phases: normalizedPhases,
    status: "draft",
  });

  return mapAssessmentTemplateToPublic(template);
}

export async function listTemplates(
  options: {
    createdBy?: string;
    status?: "draft" | "published";
  } = {}
): Promise<PublicAssessmentTemplate[]> {
  const creatorId = options.createdBy
    ? toObjectId(options.createdBy, "Invalid creator id")
    : undefined;

  const templates = await assessmentTemplateRepository.listTemplates({
    createdBy: creatorId,
    status: options.status,
  });

  return templates.map(mapAssessmentTemplateToPublic);
}

export async function publishTemplate(
  templateId: string
): Promise<PublicAssessmentTemplate> {
  const objectId = toObjectId(templateId, "Invalid template id");

  const template = await assessmentTemplateRepository.findTemplateById(
    objectId
  );

  if (!template) {
    throw new NotFoundError("Template not found");
  }

  if (!template.phases.length) {
    throw new BadRequestError("Template must have at least one phase");
  }

  const published = await assessmentTemplateRepository.updateTemplateById(
    objectId,
    {
      status: "published",
      publishedAt: new Date(),
    }
  );

  if (!published) {
    throw new NotFoundError("Template not found");
  }

  return mapAssessmentTemplateToPublic(published);
}

export async function getTemplate(
  templateId: string
): Promise<PublicAssessmentTemplate> {
  const objectId = toObjectId(templateId, "Invalid template id");
  const template = await assessmentTemplateRepository.findTemplateById(
    objectId
  );

  if (!template) {
    throw new NotFoundError("Template not found");
  }

  return mapAssessmentTemplateToPublic(template);
}

function normalizeTemplatePhases(
  phases: CreateTemplatePhaseInput[]
): AssessmentTemplatePhase[] {
  const seenIds = new Set<string>();

  return phases.map((phase, index) => {
    if (phase.weight <= 0) {
      throw new BadRequestError(
        `Phase ${index + 1} must have a positive weight`
      );
    }

    const id = phase.id?.trim() || randomUUID();

    if (seenIds.has(id)) {
      throw new BadRequestError("Phase identifiers must be unique");
    }

    seenIds.add(id);

    return {
      id,
      type: phase.type,
      title: phase.title.trim(),
      instructions: phase.instructions?.trim() || undefined,
      weight: phase.weight,
      durationMinutes: phase.durationMinutes,
      aiConfig: normalizeAiConfig(phase.aiConfig),
    } satisfies AssessmentTemplatePhase;
  });
}

function normalizeAiConfig(
  config?: AssessmentPhaseAiConfig
): AssessmentPhaseAiConfig | undefined {
  if (!config) {
    return undefined;
  }

  const cleaned: AssessmentPhaseAiConfig = {};

  if (config.difficulty) {
    cleaned.difficulty = config.difficulty;
  }

  if (config.languageKey) {
    cleaned.languageKey = config.languageKey.trim();
  }

  if (config.focusAreas?.length) {
    cleaned.focusAreas = config.focusAreas.map((area) => area.trim());
  }

  if (config.rubric?.length) {
    cleaned.rubric = config.rubric.map((item) => item.trim());
  }

  if (config.expectedDurationMinutes !== undefined) {
    cleaned.expectedDurationMinutes = config.expectedDurationMinutes;
  }

  if (config.promptContext) {
    cleaned.promptContext = config.promptContext.trim();
  }

  if (config.referenceMaterials?.length) {
    cleaned.referenceMaterials = config.referenceMaterials.map((item) =>
      item.trim()
    );
  }

  return cleaned;
}

function toObjectId(value: string, message: string): ObjectId {
  try {
    return new ObjectId(value);
  } catch {
    throw new BadRequestError(message);
  }
}
