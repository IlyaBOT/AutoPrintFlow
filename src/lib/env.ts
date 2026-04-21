import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_COOKIE_NAME: z.string().min(1).default("autoprintflow_session"),
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 characters"),
  ADMIN_EMAIL: z.string().email().default("admin@autoprintflow.local"),
  ADMIN_PASSWORD: z.string().min(8).default("admin12345"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_ORIGIN: optionalString.pipe(z.string().url().optional()),
  TURNSTILE_SITE_KEY: optionalString,
  TURNSTILE_SECRET_KEY: optionalString,
}).superRefine((env, context) => {
  const hasSiteKey = Boolean(env.TURNSTILE_SITE_KEY);
  const hasSecretKey = Boolean(env.TURNSTILE_SECRET_KEY);

  if (hasSiteKey !== hasSecretKey) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY must be configured together",
      path: hasSiteKey ? ["TURNSTILE_SECRET_KEY"] : ["TURNSTILE_SITE_KEY"],
    });
  }
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
