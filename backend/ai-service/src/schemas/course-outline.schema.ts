import { z } from "zod";

export const mcqSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).min(2),
  answerIndex: z.number().int().nonnegative(),
});

export const codingChallengeSchema = z.object({
  prompt: z.string(),
  sampleInput: z.string().optional(),
  sampleOutput: z.string().optional(),
  languageKey: z.string().min(1),
});

export const topicSchema = z.object({
  title: z.string(),
  description: z.string(),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  youtubeSearchQuery: z.string(),
  youtubeLink: z.string().url().optional(),
  starterCode: z.string(),
  prerequisites: z.array(z.string()).default([]),
  mcqs: z.array(mcqSchema).min(1),
  codingChallenge: codingChallengeSchema,
});

export const courseOutlineSchema = z.object({
  courseTitle: z.string(),
  technology: z.string(),
  description: z.string(),
  languageKey: z.string(),
  levels: z
    .array(
      z.object({
        level: z.enum(["beginner", "intermediate", "advanced"]),
        topics: z.array(topicSchema).min(1),
      })
    )
    .min(1),
});

export type CourseOutline = z.infer<typeof courseOutlineSchema>;
export type CourseTopic = z.infer<typeof topicSchema>;
export type CourseMCQ = z.infer<typeof mcqSchema>;
export type CourseCodingChallenge = z.infer<typeof codingChallengeSchema>;
