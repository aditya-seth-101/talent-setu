import OpenAI from "openai";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { cache, buildCacheKey } from "./cache/cache.service.js";
import { courseOutlineSchema } from "../schemas/course-outline.schema.js";
import {
  buildCourseOutlinePrompt,
  courseOutlineJsonSchema,
  type CourseOutlineResult,
} from "../prompts/course-outline.prompt.js";

const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const CACHE_TTL_MS = env.PROMPT_CACHE_TTL_SECONDS * 1000;
const MODEL = env.OPENAI_MODEL ?? "gpt-4.1-mini";

type ResponseLike = {
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: unknown;
    }>;
  }>;
};

type CourseRequest = {
  technology: string;
  level: "beginner" | "intermediate" | "advanced";
  seed?: string;
  forceRefresh?: boolean;
};

export async function generateCourseOutline({
  technology,
  level,
  seed,
  forceRefresh,
}: CourseRequest): Promise<CourseOutlineResult> {
  const cacheKey = buildCacheKey([
    "course-outline",
    technology.toLowerCase(),
    level,
    seed ?? "default",
  ]);

  if (!forceRefresh) {
    const cached = cache.get<CourseOutlineResult>(cacheKey);
    if (cached) {
      logger.debug(
        { technology, level, seed },
        "Returning course outline from cache"
      );
      return cached;
    }
  }

  logger.info(
    { technology, level, seed, model: MODEL },
    "Generating course outline via OpenAI"
  );

  const systemPrompt = buildCourseOutlinePrompt({ technology, level, seed });

  const request = {
    model: MODEL,
    input: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: JSON.stringify({ technology, level, seed }),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: courseOutlineJsonSchema,
    },
  } as Parameters<typeof client.responses.create>[0];

  const response = await client.responses.create(request);

  const outputText = extractJsonText(response);

  const parsed = courseOutlineSchema.parse(JSON.parse(outputText));

  if (CACHE_TTL_MS > 0) {
    cache.set(cacheKey, parsed, CACHE_TTL_MS);
  }

  return parsed;
}

function extractJsonText(response: unknown): string {
  if (!response || typeof response !== "object") {
    throw new Error("AI service returned unexpected response format");
  }

  if ("toReadableStream" in response) {
    throw new Error(
      "Streaming responses are not supported for course outline generation"
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
