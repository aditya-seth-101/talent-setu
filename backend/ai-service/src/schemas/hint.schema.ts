import { z } from "zod";

const challengeTypeEnum = z.enum(["mcq", "coding", "debug"]);
const difficultyEnum = z.enum(["beginner", "intermediate", "advanced"]);

export const hintRequestSchema = z
  .object({
    course: z.object({
      title: z.string().min(1),
      languageKey: z.string().min(1),
    }),
    topic: z.object({
      title: z.string().min(1),
      description: z.string().min(1).optional(),
    }),
    challenge: z.object({
      type: challengeTypeEnum,
      difficulty: difficultyEnum.optional(),
      prompt: z.string().min(1),
    }),
    attempt: z
      .object({
        attemptId: z.string().optional(),
        sourceCode: z.string().max(20000).optional(),
        stdout: z.string().max(8000).optional(),
        stderr: z.string().max(8000).optional(),
        message: z.string().max(4000).optional(),
      })
      .optional(),
  })
  .strict();

export type HintRequest = z.infer<typeof hintRequestSchema>;

export const hintResponseSchema = z
  .object({
    hint: z.string().min(1),
    followUps: z.array(z.string().min(1)).max(3).default([]),
  })
  .strict();

export type HintResponse = z.infer<typeof hintResponseSchema>;
