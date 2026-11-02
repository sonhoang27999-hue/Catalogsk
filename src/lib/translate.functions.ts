import { createServerFn } from "@tanstack/react-start";
import { TranslationInput as Input } from "./engine/translationInput";

export type OnlineResult = { text: string; pinyin: string; meaning: string } | { error: string };

export const translateOnline = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<OnlineResult> => {
    const { aiTranslate } = await import("./ai/translate.server");
    return aiTranslate({ ...data, examples: data.examples ?? [], brief: data.brief === true });
  });
