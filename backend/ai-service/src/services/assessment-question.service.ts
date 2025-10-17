import OpenAI from "openai";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import {
  assessmentQuestionResponseSchema,
  type AssessmentQuestionRequest,
  type AssessmentQuestionResponse,
} from "../schemas/assessment-question.schema.js";
import {
  buildAssessmentQuestionPrompt,
  assessmentQuestionJsonSchema,
} from "../prompts/assessment-question.prompt.js";
import { hashSeed } from "../utils/hash-seed.js";

const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const MODEL = env.OPENAI_MODEL ?? "gpt-4.1-mini";

type ResponseLike = {
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: unknown;
    }>;
  }>;
};

export async function generateAssessmentPhaseContent(
  payload: AssessmentQuestionRequest
): Promise<AssessmentQuestionResponse> {
  const prompt = buildAssessmentQuestionPrompt(payload);

  const response = await client.responses.create({
    model: MODEL,
    input: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: assessmentQuestionJsonSchema,
    },
    seed: hashSeed(payload.seed),
  });

  const jsonText = extractJsonText(response);
  const parsed = assessmentQuestionResponseSchema.parse(JSON.parse(jsonText));
  return parsed;
}

function extractJsonText(response: unknown): string {
  if (!response || typeof response !== "object") {
    throw new Error("AI service returned unexpected response format");
  }

  if ("toReadableStream" in response) {
    throw new Error("Streaming responses are not supported for assessments");
  }

  const structured = response as ResponseLike;

  if (!Array.isArray(structured.output)) {
    throw new Error("AI service returned unexpected response format");
  }

  for (const output of structured.output) {
    if (!output || !Array.isArray(output.content)) {
      continue;
    }

    for (const item of output.content) {
      if (item?.type === "output_text" && typeof item.text === "string") {
        return item.text;
      }
    }
  }

  logger.error({ response: structured }, "AI assessment response missing text");
  throw new Error("AI service returned unexpected response format");
}
