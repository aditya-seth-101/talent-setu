import { z } from "zod";

const speakerEnum = z.enum(["candidate", "assistant", "system"]);

const rubricEntrySchema = z
  .object({
    criterion: z.string().min(1),
    description: z.string().optional(),
  })
  .strict();

const transcriptSegmentSchema = z
  .object({
    at: z.string().min(1),
    speaker: speakerEnum,
    text: z.string().min(1),
  })
  .strict();

export const voiceEvaluationRequestSchema = z
  .object({
    seed: z.string().min(8),
    template: z
      .object({
        id: z.string().min(1),
        name: z.string().min(1),
      })
      .strict(),
    phase: z
      .object({
        id: z.string().min(1),
        title: z.string().min(1),
        instructions: z.string().optional(),
        durationMinutes: z.number().int().positive().optional(),
      })
      .strict(),
    transcript: z.string().min(1),
    segments: z.array(transcriptSegmentSchema).optional(),
    rubric: z.array(rubricEntrySchema).min(1),
    candidate: z
      .object({
        displayName: z.string().min(1),
        experienceYears: z.number().int().min(0).optional(),
      })
      .strict(),
  })
  .strict();

const rubricNoteSchema = z
  .object({
    criterion: z.string().min(1),
    score: z.number().min(0).max(100).optional(),
    notes: z.string().optional(),
  })
  .strict();

export const voiceEvaluationResponseSchema = z
  .object({
    score: z.number().min(0).max(100).optional(),
    maxScore: z.number().positive().optional(),
    rubricNotes: z.array(rubricNoteSchema).optional(),
    summary: z.string().optional(),
    recommendation: z.string().optional(),
  })
  .strict();

export type VoiceEvaluationRequest = z.infer<
  typeof voiceEvaluationRequestSchema
>;

export type VoiceEvaluationResponse = z.infer<
  typeof voiceEvaluationResponseSchema
>;
