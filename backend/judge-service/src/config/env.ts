import { config } from "dotenv";
import { z } from "zod";

config({ path: ".env" });

const envSchema = z.object({
  PORT: z.coerce.number().default(4200),
  JUDGE0_BASE_URL: z.string().url().default("https://judge0-ce.p.rapidapi.com"),
  JUDGE0_API_KEY: z.string().optional(),
  CALLBACK_BASE_URL: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid Judge service environment configuration: ${parsed.error.message}`
  );
}

export const env = parsed.data;
