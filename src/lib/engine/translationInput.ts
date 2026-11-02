import { z } from "zod";
import { SourceExampleSchema } from "./sourceHistory";

export const TranslationInput = z.object({
  text: z.string().trim().min(1).max(2000),
  from: z.enum(["vi", "zh", "en"]),
  to: z.enum(["vi", "zh", "en"]),
  terms: z.array(z.object({ vi: z.string(), zh: z.string(), en: z.string() })).max(40),
  examples: z.array(SourceExampleSchema.extend({ text: z.string().trim().min(1).max(400) })).max(3).optional(),
  brief: z.boolean().optional(),
  context: z.array(z.object({ from: z.enum(["vi", "zh", "en"]), text: z.string().trim().min(1).max(500) })).max(4).optional(),
});
export type TranslationInputData = z.infer<typeof TranslationInput>;