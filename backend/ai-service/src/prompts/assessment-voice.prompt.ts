import type { VoiceEvaluationRequest } from "../schemas/assessment-voice-evaluation.schema.js";

export const voiceEvaluationJsonSchema = {
  name: "assessment_voice_evaluation",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      score: { type: "number" },
      maxScore: { type: "number" },
      rubricNotes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            criterion: { type: "string" },
            score: { type: "number" },
            notes: { type: "string" },
          },
          required: ["criterion"],
          additionalProperties: false,
        },
      },
      summary: { type: "string" },
      recommendation: { type: "string" },
    },
  },
} as const;

export function buildVoiceEvaluationPrompt(payload: VoiceEvaluationRequest) {
  const rubricText = payload.rubric
    .map((entry, index) => {
      const description = entry.description ? ` — ${entry.description}` : "";
      return `${index + 1}. ${entry.criterion}${description}`;
    })
    .join("\n");

  const system = `You are an impartial technical interviewer assessing a candidate's spoken responses. Use the rubric to assign transparent scores out of 100 and provide brief coaching notes. Keep feedback constructive.`;

  const userPayload = {
    seed: payload.seed,
    template: payload.template,
    phase: payload.phase,
    candidate: payload.candidate,
    rubric: rubricText,
    transcript: payload.transcript,
    segments: payload.segments,
  } satisfies Record<string, unknown>;

  return {
    system,
    user: JSON.stringify(userPayload, null, 2),
  };
}
