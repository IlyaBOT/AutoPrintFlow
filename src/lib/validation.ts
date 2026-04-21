import { z } from "zod";

const optionalTurnstileTokenSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}, z.string().max(2048).optional());

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(200).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(200),
  website: z.string().trim().max(200).optional(),
  turnstileToken: optionalTurnstileTokenSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(200).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(200),
  website: z.string().trim().max(200).optional(),
  turnstileToken: optionalTurnstileTokenSchema,
});

export const editorStateSchema = z.object({
  x: z.number().finite().min(-2048).max(4096),
  y: z.number().finite().min(-2048).max(4096),
  scaleX: z.number().finite().positive().min(0.05).max(8),
  scaleY: z.number().finite().positive().min(0.05).max(8),
  rotation: z.number().finite().min(-360).max(360),
});

export const rejectStickerSchema = z.object({
  reason: z.string().trim().min(3).max(300),
});

export function parseEditorState(input: unknown) {
  return editorStateSchema.parse(input);
}
