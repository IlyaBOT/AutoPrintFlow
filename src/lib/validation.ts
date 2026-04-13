import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(200).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(200).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(200),
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
