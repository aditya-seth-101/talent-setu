import type { HintRequest } from "../schemas/hint.schema.js";

export const challengeHintJsonSchema = {
  name: "challenge_hint",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["hint"],
    properties: {
      hint: {
        type: "string",
        description:
          "A concise coaching hint (max ~60 words) that nudges the learner without revealing the full solution.",
      },
      followUps: {
        type: "array",
        description:
          "Optional follow-up questions that encourage the learner to reflect or explore the solution space.",
        maxItems: 3,
        items: {
          type: "string",
          description: "A short question (max ~40 words).",
        },
      },
    },
  },
} as const;

export function buildChallengeHintPrompt({
  course,
  topic,
  challenge,
  attempt,
}: HintRequest): { system: string; user: string } {
  const attemptSections = [
    attempt?.message ? `Outcome: ${truncate(attempt.message, 400)}` : null,
    attempt?.stdout
      ? `Program stdout:\n${truncate(attempt.stdout, 600)}`
      : null,
    attempt?.stderr
      ? `Program stderr:\n${truncate(attempt.stderr, 600)}`
      : null,
    attempt?.sourceCode
      ? `Submitted source:\n${truncate(attempt.sourceCode, 1200)}`
      : null,
  ].filter(Boolean);

  const userPrompt = `Course: ${course.title} (${course.languageKey})
Topic: ${topic.title}
Challenge type: ${challenge.type}
Difficulty: ${challenge.difficulty ?? "unspecified"}

Challenge prompt:
${challenge.prompt}

Topic description (context):
${topic.description ?? "Not provided"}

Candidate attempt summary:
${
  attemptSections.length > 0
    ? attemptSections.join("\n\n")
    : "No attempt details supplied."
}

Coaching goals:
- Provide exactly one actionable hint (max ~60 words).
- Keep the hint solution-free, but reference specific symptoms or mistakes.
- Suggest up to two short follow-up questions only if they reinforce learning.
- The learner should remain responsible for writing the final code.

Return only JSON compatible with the provided schema.`;

  const systemPrompt = `You are an encouraging coding mentor for a learning platform.
Provide guidance that helps learners reason about their mistakes without handing over the full solution.
Keep hints short, focused, and respectful. If attempt data is missing, give a general strategic nudge.`;

  return { system: systemPrompt, user: userPrompt };
}

function truncate(value: string, limit: number): string {
  if (value.length <= limit) {
    return value;
  }
  return `${value.slice(0, limit)}…`;
}
