import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_COOKIE_NAME: z.string().min(1).default("autoprintflow_session"),
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 characters"),
  ADMIN_EMAIL: z.string().email().default("admin@autoprintflow.local"),
  ADMIN_PASSWORD: z.string().min(8).default("admin12345"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type ServerEnv = z.infer<typeof envSchema>;

let cachedEnv: ServerEnv | null = null;

export function getEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error(
      `Invalid environment variables:\n${parsed.error.errors
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("\n")}`,
    );
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
