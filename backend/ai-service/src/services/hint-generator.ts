import OpenAI from "openai";
import { env } from "../config/env.js";
import {
  hintResponseSchema,
  type HintRequest,
  type HintResponse,
} from "../schemas/hint.schema.js";
import {
  buildChallengeHintPrompt,
  challengeHintJsonSchema,
} from "../prompts/challenge-hint.prompt.js";

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

export async function generateChallengeHint(
  payload: HintRequest
): Promise<HintResponse> {
  const prompts = buildChallengeHintPrompt(payload);

  const response = await client.responses.create({
    model: MODEL,
    input: [
      { role: "system", content: prompts.system },
      { role: "user", content: prompts.user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: challengeHintJsonSchema,
    },
  });

  const jsonText = extractJsonText(response);
  const parsed = hintResponseSchema.parse(JSON.parse(jsonText));

  return {
    hint: parsed.hint,
    followUps: parsed.followUps ?? [],
  };
}

function extractJsonText(response: unknown): string {
  if (!response || typeof response !== "object") {
    throw new Error("AI service returned unexpected response format");
  }

  if ("toReadableStream" in response) {
    throw new Error(
      "Streaming responses are not supported for hint generation"
    );
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

  throw new Error("AI service returned unexpected response format");
}
