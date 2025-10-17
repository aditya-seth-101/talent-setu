import { z } from "zod";

const phaseType = z.enum(["voice", "coding", "debug", "mcq"]);

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

export const assessmentQuestionRequestSchema = z
  .object({
    seed: z.string().min(8),
    template: z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      durationMinutes: z.number().int().positive(),
    }),
    phase: z
      .object({
        id: z.string().min(1),
        type: phaseType,
        title: z.string().min(1),
        instructions: z.string().optional(),
        weight: z.number().positive(),
        durationMinutes: z.number().int().positive().optional(),
        aiConfig: aiConfigSchema,
      })
      .strict(),
    techStack: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          slug: z.string().min(1),
          languageKey: z.string().min(1).optional(),
          languageId: z.number().int().positive().optional(),
        })
      )
      .optional(),
    candidate: z.object({
      userId: z.string().min(1),
      displayName: z.string().min(1),
      headline: z.string().optional(),
      experienceYears: z.number().int().min(0).optional(),
      technologies: z
        .array(
          z.object({
            id: z.string().min(1),
            name: z.string().optional(),
            slug: z.string().optional(),
          })
        )
        .optional(),
    }),
  })
  .strict();

const programmingFileSchema = z.object({
  filename: z.string().min(1),
  contents: z.string().default(""),
});

const testCaseSchema = z.object({
  stdin: z.string().optional(),
  expectedOutput: z.string().optional(),
  description: z.string().optional(),
  weight: z.number().optional(),
});

const mcqSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  answerIndex: z.number().int().nonnegative().optional(),
  explanation: z.string().optional(),
});

const voiceScriptSchema = z.object({
  opener: z.string().min(1),
  followUps: z.array(z.string().min(1)).min(1),
  closing: z.string().optional(),
});

export const assessmentQuestionResponseSchema = z
  .object({
    prompt: z.string().min(1),
    summary: z.string().optional(),
    starterCode: z.string().optional(),
    starterFiles: z.array(programmingFileSchema).optional(),
    testCases: z.array(testCaseSchema).optional(),
    mcqs: z.array(mcqSchema).optional(),
    voiceScript: voiceScriptSchema.optional(),
    rubric: z.array(z.string().min(1)).optional(),
    hints: z.array(z.string().min(1)).optional(),
    evaluationNotes: z.array(z.string().min(1)).optional(),
    additional: z.record(z.any()).optional(),
  })
  .strict();

export type AssessmentQuestionRequest = z.infer<
  typeof assessmentQuestionRequestSchema
>;

export type AssessmentQuestionResponse = z.infer<
  typeof assessmentQuestionResponseSchema
>;
