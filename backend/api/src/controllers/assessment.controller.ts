import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import {
  createAssessmentFromTemplate,
  getAssessmentForUser,
  recordVoiceTranscript,
  startAssessment,
  submitCodingAttempt,
} from "../services/assessment/assessment.service.js";
import {
  createTemplate,
  getTemplate,
  listTemplates,
  publishTemplate,
} from "../services/assessment/template.service.js";

const objectId = z.string().length(24, "Invalid identifier");

const aiConfigSchema = z
  .object({
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    languageKey: z.string().min(1).optional(),
    focusAreas: z.array(z.string().min(1)).optional(),
    rubric: z.array(z.string().min(1)).optional(),
    expectedDurationMinutes: z.number().int().positive().optional(),
    promptContext: z.string().min(1).optional(),
    referenceMaterials: z.array(z.string().min(1)).optional(),
  })
  .strict()
  .optional();

const templatePhaseSchema = z
  .object({
    id: z.string().min(1).optional(),
    type: z.enum(["voice", "coding", "debug", "mcq"]),
    title: z.string().min(1),
    instructions: z.string().min(1).optional(),
    weight: z.number().positive(),
    durationMinutes: z.number().int().positive().optional(),
    aiConfig: aiConfigSchema,
  })
  .strict();

const createTemplateSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
    techStack: z.array(objectId),
    durationMinutes: z.number().int().positive(),
    phases: z.array(templatePhaseSchema).min(1),
  })
  .strict();

const listTemplatesQuerySchema = z
  .object({
    status: z.enum(["draft", "published"]).optional(),
  })
  .strict();

const publishTemplateParamsSchema = z.object({
  templateId: objectId,
});

const createAssessmentSchema = z
  .object({
    templateId: objectId,
    candidateId: objectId,
    kioskFlag: z.boolean().optional(),
  })
  .strict();

const assessmentParamsSchema = z.object({
  assessmentId: objectId,
});

const assessmentPhaseParamsSchema = assessmentParamsSchema.extend({
  phaseId: z.string().min(1),
});

const startAssessmentSchema = z
  .object({
    kioskFlag: z.boolean().optional(),
  })
  .strict();

const transcriptSchema = z
  .object({
    transcript: z.string().min(1),
    segments: z
      .array(
        z.object({
          at: z.string().min(1),
          speaker: z.enum(["candidate", "assistant", "system"]),
          text: z.string().min(1),
        })
      )
      .optional(),
  })
  .strict();

const codingAttemptSchema = z
  .object({
    sourceCode: z.string().min(1),
    languageId: z.number().int().positive().optional(),
    stdin: z.string().optional(),
    expectedOutput: z.string().optional(),
  })
  .strict();

export async function createAssessmentTemplateHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = createTemplateSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const template = await createTemplate(userId, body);
    res.status(201).json({ template });
  } catch (error) {
    next(error);
  }
}

export async function listAssessmentTemplatesHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const query = listTemplatesQuerySchema.parse(req.query);
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const templates = await listTemplates({
      createdBy: req.user?.roles.includes("admin") ? undefined : userId,
      status: query.status,
    });

    res.status(200).json({ templates });
  } catch (error) {
    next(error);
  }
}

export async function publishAssessmentTemplateHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { templateId } = publishTemplateParamsSchema.parse(req.params);
    const template = await publishTemplate(templateId);
    res.status(200).json({ template });
  } catch (error) {
    next(error);
  }
}

export async function getAssessmentTemplateHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { templateId } = publishTemplateParamsSchema.parse(req.params);
    const template = await getTemplate(templateId);
    res.status(200).json({ template });
  } catch (error) {
    next(error);
  }
}

export async function createAssessmentHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = createAssessmentSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const assessment = await createAssessmentFromTemplate(userId, body);
    res.status(201).json({ assessment });
  } catch (error) {
    next(error);
  }
}

export async function getAssessmentHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { assessmentId } = assessmentParamsSchema.parse(req.params);
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const assessment = await getAssessmentForUser(
      assessmentId,
      userId,
      req.user?.roles ?? []
    );

    res.status(200).json({ assessment });
  } catch (error) {
    next(error);
  }
}

export async function startAssessmentHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { assessmentId } = assessmentParamsSchema.parse(req.params);
    const body = startAssessmentSchema.parse(req.body ?? {});
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const assessment = await startAssessment(assessmentId, userId, body);
    res.status(200).json({ assessment });
  } catch (error) {
    next(error);
  }
}

export async function recordVoiceTranscriptHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { assessmentId, phaseId } = assessmentPhaseParamsSchema.parse(
      req.params
    );
    const body = transcriptSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const assessment = await recordVoiceTranscript(
      assessmentId,
      phaseId,
      userId,
      req.user?.roles ?? [],
      body
    );

    res.status(200).json({ assessment });
  } catch (error) {
    next(error);
  }
}

export async function submitCodingAttemptHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { assessmentId, phaseId } = assessmentPhaseParamsSchema.parse(
      req.params
    );
    const body = codingAttemptSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { assessment, attemptId } = await submitCodingAttempt(
      assessmentId,
      phaseId,
      userId,
      body
    );

    res.status(202).json({ assessment, attemptId });
  } catch (error) {
    next(error);
  }
}
