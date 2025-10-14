import { config } from "dotenv";
import { z } from "zod";

config({ path: ".env" });

const envSchema = z.object({
  PORT: z.coerce.number().default(4100),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  OPENAI_MODEL: z.string().optional(),
  PROMPT_CACHE_TTL_SECONDS: z.coerce.number().int().nonnegative().default(3600),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid AI service environment configuration: ${parsed.error.message}`
  );
}

export const env = parsed.data;
