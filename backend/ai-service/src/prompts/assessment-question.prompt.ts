import type { AssessmentQuestionRequest } from "../schemas/assessment-question.schema.js";

export const assessmentQuestionJsonSchema = {
  name: "assessment_phase_content",
  schema: {
    type: "object",
    required: ["prompt"],
    properties: {
      prompt: { type: "string" },
      summary: { type: "string" },
      starterCode: { type: "string" },
      starterFiles: {
        type: "array",
        items: {
          type: "object",
          required: ["filename", "contents"],
          properties: {
            filename: { type: "string" },
            contents: { type: "string" },
          },
        },
      },
      testCases: {
        type: "array",
        items: {
          type: "object",
          properties: {
            stdin: { type: "string" },
            expectedOutput: { type: "string" },
            description: { type: "string" },
            weight: { type: "number" },
          },
        },
      },
      mcqs: {
        type: "array",
        items: {
          type: "object",
          required: ["question", "options"],
          properties: {
            question: { type: "string" },
            options: {
              type: "array",
              minItems: 2,
              items: { type: "string" },
            },
            answerIndex: { type: "integer" },
            explanation: { type: "string" },
          },
        },
      },
      voiceScript: {
        type: "object",
        required: ["opener", "followUps"],
        properties: {
          opener: { type: "string" },
          followUps: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
          },
          closing: { type: "string" },
        },
      },
      rubric: {
        type: "array",
        items: { type: "string" },
      },
      hints: {
        type: "array",
        items: { type: "string" },
      },
      evaluationNotes: {
        type: "array",
        items: { type: "string" },
      },
      additional: {
        type: "object",
        additionalProperties: true,
      },
    },
    additionalProperties: false,
  },
} as const;

export function buildAssessmentQuestionPrompt(
  payload: AssessmentQuestionRequest
) {
  const techDescriptions = (payload.techStack ?? [])
    .map((tech) => `${tech.name} (${tech.slug})`)
    .join(", ");

  const focusAreas = payload.phase.aiConfig?.focusAreas?.join(", ");

  const system = `You are an assessment content generator for a multi-phase hiring process. Produce questions that are original, fair, and aligned with the given template. Return JSON matching the provided schema. Avoid leaking explicit answers unless requested.`;

  const user = {
    instructions: payload.phase.instructions,
    template: {
      id: payload.template.id,
      name: payload.template.name,
      durationMinutes: payload.template.durationMinutes,
    },
    phase: {
      id: payload.phase.id,
      type: payload.phase.type,
      title: payload.phase.title,
      weight: payload.phase.weight,
      durationMinutes: payload.phase.durationMinutes,
      difficulty: payload.phase.aiConfig?.difficulty,
      focusAreas,
      languageKey: payload.phase.aiConfig?.languageKey,
      promptContext: payload.phase.aiConfig?.promptContext,
      referenceMaterials: payload.phase.aiConfig?.referenceMaterials,
    },
    techStack: techDescriptions,
    candidate: {
      displayName: payload.candidate.displayName,
      headline: payload.candidate.headline,
      experienceYears: payload.candidate.experienceYears,
      technologies: (payload.candidate.technologies ?? [])
        .map((tech) => tech.slug ?? tech.name ?? tech.id)
        .join(", "),
    },
    seed: payload.seed,
  } satisfies Record<string, unknown>;

  return {
    system,
    user: JSON.stringify(user, null, 2),
  };
}
