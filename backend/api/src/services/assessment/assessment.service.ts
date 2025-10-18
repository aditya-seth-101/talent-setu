import { createHash, randomUUID } from "crypto";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import {
  mapAssessmentToPublic,
  type AssessmentDocument,
  type AssessmentPhaseInstance,
  type AssessmentPhaseEvaluation,
  type AssessmentTranscriptSegment,
  type AssessmentStatus,
  type PublicAssessment,
  type MapAssessmentOptions,
} from "../../models/assessment.model.js";
import type {
  AssessmentPhaseType,
  AssessmentTemplateDocument,
  AssessmentTemplatePhase,
} from "../../models/assessment-template.model.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../utils/http-errors.js";
import * as assessmentRepository from "../../repositories/assessment.repository.js";
import * as assessmentTemplateRepository from "../../repositories/assessment-template.repository.js";
import * as profileRepository from "../../repositories/profile.repository.js";
import * as technologyRepository from "../../repositories/technology.repository.js";
import { submitAttempt as submitJudgeAttempt } from "../judge/judge.service.js";
import type { Role } from "../../middleware/rbac.js";

interface CreateAssessmentPayload {
  templateId: string;
  candidateId: string;
  kioskFlag?: boolean;
}

interface StartAssessmentPayload {
  kioskFlag?: boolean;
}

interface VoiceTranscriptPayload {
  transcript: string;
  segments?: Array<{
    at: string;
    speaker: "candidate" | "assistant" | "system";
    text: string;
  }>;
}

interface CodingAttemptPayload {
  sourceCode: string;
  languageId?: number;
  stdin?: string;
  expectedOutput?: string;
}

const phaseContentSchema = z
  .object({
    prompt: z.string().min(1),
    summary: z.string().optional(),
    starterCode: z.string().optional(),
    starterFiles: z
      .array(
        z.object({
          filename: z.string().min(1),
          contents: z.string().default(""),
        })
      )
      .optional(),
    testCases: z
      .array(
        z.object({
          stdin: z.string().optional(),
          expectedOutput: z.string().optional(),
          description: z.string().optional(),
          weight: z.number().optional(),
        })
      )
      .optional(),
    mcqs: z
      .array(
        z.object({
          question: z.string().min(1),
          options: z.array(z.string()).min(2),
          answerIndex: z.number().int().nonnegative().optional(),
          explanation: z.string().optional(),
        })
      )
      .optional(),
    voiceScript: z
      .object({
        opener: z.string().min(1),
        followUps: z.array(z.string()).min(1),
        closing: z.string().optional(),
      })
      .optional(),
    rubric: z.array(z.string().min(1)).optional(),
    hints: z.array(z.string().min(1)).optional(),
    evaluationNotes: z.array(z.string().min(1)).optional(),
    additional: z.record(z.any()).optional(),
  })
  .strict();

const voiceEvaluationResponseSchema = z
  .object({
    score: z.number().min(0).max(100).optional(),
    maxScore: z.number().positive().optional(),
    rubricNotes: z
      .array(
        z.object({
          criterion: z.string().min(1),
          score: z.number().min(0).max(100).optional(),
          notes: z.string().optional(),
        })
      )
      .optional(),
    summary: z.string().optional(),
    recommendation: z.string().optional(),
  })
  // Allow passthrough so extra debugging/info fields from AI service
  // (e.g., prompt, rubric, hints) do not break evaluation parsing.
  .passthrough();

type RubricEntry = {
  criterion: string;
  description?: string;
};

const DEFAULT_VOICE_RUBRIC: RubricEntry[] = [
  {
    criterion: "Communication Clarity",
    description:
      "Candidate articulates responses clearly with structured explanations and minimal filler.",
  },
  {
    criterion: "Technical Depth",
    description:
      "Candidate demonstrates solid understanding of core concepts and can reason about trade-offs.",
  },
  {
    criterion: "Collaboration Mindset",
    description:
      "Candidate listens, acknowledges prompts, and responds with a collaborative tone.",
  },
];

export async function createAssessmentFromTemplate(
  recruiterId: string,
  payload: CreateAssessmentPayload
): Promise<PublicAssessment> {
  const templateId = toObjectId(payload.templateId, "Invalid template id");
  const template = await assessmentTemplateRepository.findTemplateById(
    templateId
  );

  if (!template) {
    throw new NotFoundError("Template not found");
  }

  if (template.status !== "published") {
    throw new BadRequestError("Template must be published before assignment");
  }

  const candidateProfile = await profileRepository.findProfileByUserId(
    payload.candidateId
  );

  if (!candidateProfile) {
    throw new BadRequestError("Candidate profile not found");
  }

  const recruiterObjectId = toObjectId(recruiterId, "Invalid recruiter id");
  const candidateObjectId = candidateProfile.userId;

  const [templateTechDocs, candidateTechDocs] = await Promise.all([
    technologyRepository.findTechnologiesByIds(template.techStack),
    technologyRepository.findTechnologiesByIds(candidateProfile.technologies),
  ]);

  const uniqueSeed = buildAssessmentSeed(
    templateId.toHexString(),
    candidateObjectId.toHexString()
  );

  const phaseInstances: AssessmentPhaseInstance[] = [];

  for (const phase of template.phases) {
    const phaseSeed = buildPhaseSeed(uniqueSeed, phase.id);
    const content = await generatePhaseContent({
      template,
      phase,
      phaseSeed,
      candidateProfile,
      templateTechDocs,
      candidateTechDocs,
    });

    phaseInstances.push({
      id: randomUUID(),
      templatePhaseId: phase.id,
      type: phase.type,
      title: phase.title,
      instructions: phase.instructions,
      status: "pending",
      weight: phase.weight,
      durationMinutes: phase.durationMinutes,
      aiSeed: phaseSeed,
      aiConfig: phase.aiConfig,
      content,
      attemptIds: [],
    });
  }

  const assessment = await assessmentRepository.createAssessment({
    templateId,
    recruiterId: recruiterObjectId,
    candidateId: candidateObjectId,
    techStack: template.techStack,
    durationMinutes: template.durationMinutes,
    status: "scheduled",
    uniqueSeed,
    kioskFlag: payload.kioskFlag ?? false,
    phases: phaseInstances,
    candidateSnapshot: {
      userId: candidateObjectId,
      displayName: candidateProfile.displayName,
      headline: candidateProfile.headline,
      experienceYears: candidateProfile.experienceYears,
      technologies: candidateProfile.technologies,
    },
  });

  return mapAssessmentToPublic(assessment);
}

export async function getAssessmentForUser(
  assessmentId: string,
  userId: string,
  roles: Role[],
  options: MapAssessmentOptions = {}
): Promise<PublicAssessment> {
  const assessment = await requireAssessment(assessmentId);

  const userObjectId = toObjectId(userId, "Invalid user id");

  const isCandidate = assessment.candidateId.equals(userObjectId);
  const isRecruiter = assessment.recruiterId.equals(userObjectId);
  const isPrivileged = roles.includes("admin") || roles.includes("proctor");

  if (!isCandidate && !isRecruiter && !isPrivileged) {
    throw new ForbiddenError("You do not have access to this assessment");
  }

  const includeSolutions = isRecruiter || isPrivileged;
  return mapAssessmentToPublic(assessment, {
    ...options,
    includeSolutions,
  });
}

export async function startAssessment(
  assessmentId: string,
  userId: string,
  payload: StartAssessmentPayload = {}
): Promise<PublicAssessment> {
  const assessment = await requireAssessment(assessmentId);
  const userObjectId = toObjectId(userId, "Invalid user id");

  if (!assessment.candidateId.equals(userObjectId)) {
    throw new ForbiddenError("Only the candidate can start the assessment");
  }

  if (assessment.status === "completed" || assessment.status === "cancelled") {
    throw new BadRequestError("Assessment can no longer be started");
  }

  const now = new Date();
  const phases = advancePhaseStatuses(assessment.phases, "start", now);

  const updated = await assessmentRepository.updateAssessmentById(
    assessment._id,
    {
      status: "in-progress",
      kioskFlag: payload.kioskFlag ?? assessment.kioskFlag,
      startedAt: assessment.startedAt ?? now,
      phases,
    }
  );

  if (!updated) {
    throw new NotFoundError("Assessment not found");
  }

  return mapAssessmentToPublic(updated);
}

export async function recordVoiceTranscript(
  assessmentId: string,
  phaseId: string,
  userId: string,
  roles: Role[],
  payload: VoiceTranscriptPayload
): Promise<PublicAssessment> {
  const assessment = await requireAssessment(assessmentId);
  const userObjectId = toObjectId(userId, "Invalid user id");

  const isCandidate = assessment.candidateId.equals(userObjectId);
  const isProctor = roles.includes("proctor") || roles.includes("admin");

  if (!isCandidate && !isProctor) {
    throw new ForbiddenError(
      "You cannot submit transcripts for this assessment"
    );
  }

  const phases = assessment.phases.map((phase) => ({ ...phase }));
  const target = phases.find((phase) => phase.id === phaseId);

  if (!target) {
    throw new NotFoundError("Phase not found");
  }

  if (target.type !== "voice") {
    throw new BadRequestError("This phase does not accept voice transcripts");
  }

  target.transcript = payload.transcript.trim();
  target.transcriptSegments = payload.segments?.map((segment) => ({
    ...segment,
    at: segment.at,
  }));
  target.status = "completed";
  target.completedAt = new Date();

  try {
    const evaluation = await evaluateVoicePhase({
      assessment,
      phase: target,
      transcript: target.transcript,
      segments: target.transcriptSegments,
    });

    if (evaluation) {
      target.evaluation = {
        ...evaluation,
        completedAt: evaluation.completedAt ?? new Date(),
      };
    }
  } catch (error) {
    logger.warn({ err: error }, "Failed to evaluate voice phase transcript");
  }

  const advanced = advancePhaseStatuses(
    phases,
    "complete",
    new Date(),
    phaseId
  );

  const updated = await assessmentRepository.updateAssessmentById(
    assessment._id,
    {
      phases: advanced,
      status: resolveAssessmentStatus(assessment.status, advanced),
      completedAt: determineCompletionTimestamp(assessment, advanced),
    }
  );

  if (!updated) {
    throw new NotFoundError("Assessment not found");
  }

  return mapAssessmentToPublic(updated, {
    includeSolutions: roles.includes("admin") || roles.includes("proctor"),
  });
}

export async function submitCodingAttempt(
  assessmentId: string,
  phaseId: string,
  userId: string,
  payload: CodingAttemptPayload
): Promise<{ assessment: PublicAssessment; attemptId: string }> {
  const assessment = await requireAssessment(assessmentId);
  const userObjectId = toObjectId(userId, "Invalid user id");

  if (!assessment.candidateId.equals(userObjectId)) {
    throw new ForbiddenError("Only the candidate can submit coding attempts");
  }

  const phases = assessment.phases.map((phase) => ({ ...phase }));
  const target = phases.find((phase) => phase.id === phaseId);

  if (!target) {
    throw new NotFoundError("Phase not found");
  }

  if (!isCodingPhase(target.type)) {
    throw new BadRequestError("This phase does not accept code submissions");
  }

  if (!payload.sourceCode || !payload.sourceCode.trim()) {
    throw new BadRequestError("sourceCode is required");
  }

  const languageId = payload.languageId ?? (await inferLanguageId(target));

  if (!languageId) {
    throw new BadRequestError(
      "languageId is required for this coding assessment phase"
    );
  }

  const attempt = await submitJudgeAttempt({
    userId,
    assessmentId: assessment._id.toHexString(),
    assessmentPhaseId: target.id,
    languageId,
    sourceCode: payload.sourceCode,
    stdin: payload.stdin,
    expectedOutput: payload.expectedOutput,
  });

  target.status = target.status === "pending" ? "active" : target.status;
  target.startedAt ??= new Date();
  target.attemptIds = [...target.attemptIds, attempt.id];

  const updated = await assessmentRepository.updateAssessmentById(
    assessment._id,
    {
      phases,
      status:
        assessment.status === "scheduled" ? "in-progress" : assessment.status,
      startedAt: assessment.startedAt ?? new Date(),
    }
  );

  if (!updated) {
    throw new NotFoundError("Assessment not found");
  }

  return {
    assessment: mapAssessmentToPublic(updated),
    attemptId: attempt.id,
  };
}

function buildAssessmentSeed(templateId: string, candidateId: string): string {
  const hash = createHash("sha256");
  hash.update(templateId);
  hash.update(candidateId);
  hash.update(Date.now().toString(16));
  return hash.digest("hex");
}

function buildPhaseSeed(assessmentSeed: string, phaseId: string): string {
  const hash = createHash("sha1");
  hash.update(assessmentSeed);
  hash.update(phaseId);
  return hash.digest("hex");
}

async function generatePhaseContent(params: {
  template: AssessmentTemplateDocument;
  phase: AssessmentTemplatePhase;
  phaseSeed: string;
  candidateProfile: Awaited<
    ReturnType<typeof profileRepository.findProfileByUserId>
  >;
  templateTechDocs: Awaited<
    ReturnType<typeof technologyRepository.findTechnologiesByIds>
  >;
  candidateTechDocs: Awaited<
    ReturnType<typeof technologyRepository.findTechnologiesByIds>
  >;
}): Promise<AssessmentPhaseInstance["content"]> {
  if (!params.candidateProfile) {
    throw new BadRequestError("Candidate profile is required");
  }

  const endpoint = `${env.AI_SERVICE_URL.replace(
    /\/$/,
    ""
  )}/assessments/questions`;

  const body = {
    seed: params.phaseSeed,
    template: {
      id: params.template._id.toHexString(),
      name: params.template.name,
      durationMinutes: params.template.durationMinutes,
    },
    phase: {
      id: params.phase.id,
      type: params.phase.type,
      title: params.phase.title,
      instructions: params.phase.instructions,
      weight: params.phase.weight,
      durationMinutes: params.phase.durationMinutes,
      aiConfig: params.phase.aiConfig,
    },
    techStack: params.templateTechDocs.map((tech) => ({
      id: tech._id.toHexString(),
      name: tech.name,
      slug: tech.slug,
      languageKey: tech.judge0_language_key,
      languageId: tech.judge0_language_id,
    })),
    candidate: {
      userId: params.candidateProfile.userId.toHexString(),
      displayName: params.candidateProfile.displayName,
      headline: params.candidateProfile.headline,
      experienceYears: params.candidateProfile.experienceYears,
      technologies: params.candidateProfile.technologies.map((id) => {
        const match = params.candidateTechDocs.find((tech) =>
          tech._id.equals(id)
        );
        return {
          id: id.toHexString(),
          name: match?.name,
          slug: match?.slug,
        };
      }),
    },
  };

  let response: globalThis.Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to reach AI assessment endpoint");
    throw new BadRequestError("Unable to reach AI question generator service");
  }

  if (!response.ok) {
    const text = await safeReadBody(response);
    logger.warn(
      {
        status: response.status,
        endpoint,
        body: text,
      },
      "AI assessment endpoint returned an error"
    );
    throw new BadRequestError(
      "AI service could not generate assessment content"
    );
  }

  const resultJson = (await response.json()) as unknown;
  const parsed = phaseContentSchema.parse(resultJson);
  return parsed;
}

async function evaluateVoicePhase(params: {
  assessment: AssessmentDocument;
  phase: AssessmentPhaseInstance;
  transcript: string;
  segments?: AssessmentTranscriptSegment[];
}): Promise<AssessmentPhaseEvaluation | undefined> {
  const template = await assessmentTemplateRepository.findTemplateById(
    params.assessment.templateId
  );

  if (!template) {
    logger.warn(
      { assessmentId: params.assessment._id.toHexString() },
      "Assessment template missing during voice evaluation"
    );
    return undefined;
  }

  const templatePhase = template.phases.find(
    (phase) => phase.id === params.phase.templatePhaseId
  );

  const rubricEntries = buildVoiceRubric(params.phase, templatePhase);
  if (!rubricEntries.length) {
    return undefined;
  }

  const endpoint = `${env.AI_SERVICE_URL.replace(
    /\/$/,
    ""
  )}/assessments/voice-evaluation`;

  const body = {
    seed: params.phase.aiSeed,
    template: {
      id: template._id.toHexString(),
      name: template.name,
    },
    phase: {
      id: params.phase.templatePhaseId,
      title: params.phase.title,
      instructions: params.phase.instructions,
      durationMinutes: params.phase.durationMinutes,
    },
    transcript: params.transcript,
    segments: params.segments,
    rubric: rubricEntries,
    candidate: {
      displayName: params.assessment.candidateSnapshot.displayName,
      experienceYears: params.assessment.candidateSnapshot.experienceYears,
    },
  };

  let response: globalThis.Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    logger.error(
      { err: error },
      "Failed to reach AI voice evaluation endpoint"
    );
    return undefined;
  }

  if (!response.ok) {
    const text = await safeReadBody(response);
    logger.warn(
      {
        status: response.status,
        endpoint,
        body: text,
      },
      "AI voice evaluation endpoint returned an error"
    );
    return undefined;
  }

  const resultJson = (await response.json()) as unknown;
  const parsed = voiceEvaluationResponseSchema.parse(resultJson);

  return {
    score: parsed.score,
    maxScore: parsed.maxScore ?? 100,
    rubricNotes: parsed.rubricNotes,
    summary: parsed.summary,
    recommendation: parsed.recommendation,
  };
}

function buildVoiceRubric(
  phase: AssessmentPhaseInstance,
  templatePhase?: AssessmentTemplatePhase
): RubricEntry[] {
  const rubricFromContent = Array.isArray(phase.content.rubric)
    ? phase.content.rubric
    : [];
  const rubricFromConfig = Array.isArray(templatePhase?.aiConfig?.rubric)
    ? templatePhase?.aiConfig?.rubric ?? []
    : [];

  const combined = [...rubricFromContent, ...rubricFromConfig];

  if (!combined.length) {
    return DEFAULT_VOICE_RUBRIC;
  }

  return combined
    .map((entry) => entry?.trim())
    .filter((entry): entry is string => Boolean(entry))
    .map((entry) => ({
      criterion: entry,
    }));
}

async function requireAssessment(
  assessmentId: string
): Promise<AssessmentDocument> {
  const objectId = toObjectId(assessmentId, "Invalid assessment id");
  const assessment = await assessmentRepository.findAssessmentById(objectId);
  if (!assessment) {
    throw new NotFoundError("Assessment not found");
  }
  return assessment;
}

function advancePhaseStatuses(
  phases: AssessmentPhaseInstance[],
  action: "start" | "complete",
  timestamp: Date,
  completedPhaseId?: string
): AssessmentPhaseInstance[] {
  const updated = phases.map((phase) => ({ ...phase }));

  if (action === "start") {
    const firstActive = updated.find((phase) => phase.status === "active");
    if (firstActive) {
      return updated;
    }

    const nextPending = updated.find((phase) => phase.status === "pending");
    if (nextPending) {
      nextPending.status = "active";
      nextPending.startedAt = nextPending.startedAt ?? timestamp;
    }
    return updated;
  }

  if (!completedPhaseId) {
    return updated;
  }

  const current = updated.find((phase) => phase.id === completedPhaseId);
  if (current) {
    current.status = "completed";
    current.completedAt = current.completedAt ?? timestamp;
  }

  const next = updated.find((phase) => phase.status === "pending");
  if (next) {
    next.status = "active";
    next.startedAt = next.startedAt ?? timestamp;
  }

  return updated;
}

function resolveAssessmentStatus(
  current: AssessmentStatus,
  phases: AssessmentPhaseInstance[]
): AssessmentStatus {
  if (phases.every((phase) => phase.status === "completed")) {
    return "completed";
  }

  if (current === "scheduled") {
    return "in-progress";
  }

  return current;
}

function determineCompletionTimestamp(
  assessment: AssessmentDocument,
  phases: AssessmentPhaseInstance[]
): Date | undefined {
  if (phases.every((phase) => phase.status === "completed")) {
    return assessment.completedAt ?? new Date();
  }

  return assessment.completedAt;
}

function isCodingPhase(type: AssessmentPhaseType): boolean {
  return type === "coding" || type === "debug";
}

async function inferLanguageId(
  phase: AssessmentPhaseInstance
): Promise<number | undefined> {
  const languageKey = phase.aiConfig?.languageKey;

  if (!languageKey) {
    const additionalLanguage =
      typeof phase.content.additional === "object"
        ? (phase.content.additional as Record<string, unknown>).languageKey
        : undefined;
    if (typeof additionalLanguage === "string") {
      return lookupLanguageId(additionalLanguage);
    }
    return undefined;
  }

  return lookupLanguageId(languageKey);
}

async function lookupLanguageId(
  languageKey: string
): Promise<number | undefined> {
  const tech = await technologyRepository.findTechnologyByLanguageKey(
    languageKey
  );
  return tech?.judge0_language_id;
}

function toObjectId(value: string, message: string): ObjectId {
  try {
    return new ObjectId(value);
  } catch {
    throw new BadRequestError(message);
  }
}

async function safeReadBody(
  response: globalThis.Response
): Promise<string | undefined> {
  try {
    return await response.text();
  } catch (error) {
    logger.warn({ err: error }, "Failed to read response body");
    return undefined;
  }
}
