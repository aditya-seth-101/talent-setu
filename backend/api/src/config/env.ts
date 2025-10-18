import { config } from "dotenv";
import { z } from "zod";

config({ path: process.env.NODE_ENV === "test" ? ".env.test" : ".env" });

// Provide safe defaults for tests so unit/integration tests can run in CI
// without requiring the operator to provide long-lived JWT secrets.
if (process.env.NODE_ENV === "test") {
  process.env.JWT_ACCESS_SECRET =
    process.env.JWT_ACCESS_SECRET ?? "test_access_secret_" + "a".repeat(16);
  process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET ?? "test_refresh_secret_" + "b".repeat(16);
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  MONGODB_URI: z
    .string()
    .url()
    .default("mongodb://localhost:27017/talent-setu"),
  MONGODB_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  EMAIL_VERIFICATION_TTL_HOURS: z.coerce.number().int().positive().default(24),
  EMAIL_VERIFICATION_BASE_URL: z
    .string()
    .url()
    .default("http://localhost:3000/verify-email"),
  JUDGE_SERVICE_URL: z.string().url().default("http://localhost:4200"),
  API_PUBLIC_URL: z.string().url().default("http://localhost:4000"),
  JUDGE_CALLBACK_SECRET: z.string().min(10).optional(),
  AI_SERVICE_URL: z.string().url().default("http://localhost:4100"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USERNAME: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  USE_MEMORY_MONGO: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

type RawEnv = z.infer<typeof envSchema>;

const rawEnv = parsed.data;

export const env: Omit<RawEnv, "USE_MEMORY_MONGO"> & {
  USE_MEMORY_MONGO: boolean;
} = {
  ...rawEnv,
  USE_MEMORY_MONGO: rawEnv.USE_MEMORY_MONGO ?? rawEnv.NODE_ENV !== "production",
};
