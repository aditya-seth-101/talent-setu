import type { CourseOutline } from "../schemas/course-outline.schema.js";

export type CourseOutlinePromptParams = {
  technology: string;
  level: "beginner" | "intermediate" | "advanced";
  seed?: string;
};

export function buildCourseOutlinePrompt({
  technology,
  level,
  seed,
}: CourseOutlinePromptParams) {
  const seedLine = seed
    ? `Use the deterministic seed ${seed} when generating randomness.`
    : "";

  return `You are an expert curriculum designer for software engineering bootcamps.
Create a JSON object that matches the provided JSON schema exactly.
Focus on ${technology} and design content appropriate for the ${level} level.
${seedLine}

Guidelines:
- Keep topic descriptions concise (<= 120 words) and actionable.
- Starter code must be a runnable snippet for the declared language key.
- Provide at least 2 MCQs per topic with exactly one correct answer.
- Provide one coding challenge per topic with a succinct prompt and optional sample IO.
- Include realistic youtubeSearchQuery strings (do not return full URLs unless instructed).
- Only output JSON; do not include markdown, explanations, or commentary.`.trim();
}

export const courseOutlineJsonSchema = {
  name: "course_outline",
  schema: {
    type: "object",
    required: [
      "courseTitle",
      "technology",
      "description",
      "languageKey",
      "levels",
    ],
    properties: {
      courseTitle: { type: "string" },
      technology: { type: "string" },
      description: { type: "string" },
      languageKey: { type: "string" },
      levels: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: ["level", "topics"],
          properties: {
            level: {
              type: "string",
              enum: ["beginner", "intermediate", "advanced"],
            },
            topics: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: [
                  "title",
                  "description",
                  "level",
                  "youtubeSearchQuery",
                  "starterCode",
                  "mcqs",
                  "codingChallenge",
                ],
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  level: {
                    type: "string",
                    enum: ["beginner", "intermediate", "advanced"],
                  },
                  youtubeSearchQuery: { type: "string" },
                  youtubeLink: { type: "string" },
                  starterCode: { type: "string" },
                  prerequisites: {
                    type: "array",
                    items: { type: "string" },
                  },
                  mcqs: {
                    type: "array",
                    minItems: 2,
                    items: {
                      type: "object",
                      required: ["question", "options", "answerIndex"],
                      properties: {
                        question: { type: "string" },
                        options: {
                          type: "array",
                          minItems: 2,
                          items: { type: "string" },
                        },
                        answerIndex: { type: "number" },
                      },
                    },
                  },
                  codingChallenge: {
                    type: "object",
                    required: ["prompt", "languageKey"],
                    properties: {
                      prompt: { type: "string" },
                      sampleInput: { type: "string" },
                      sampleOutput: { type: "string" },
                      languageKey: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies { name: string; schema: Record<string, unknown> };

export type CourseOutlineResult = CourseOutline;
