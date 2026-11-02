import { createFileRoute } from "@tanstack/react-router";
import { TranslationInput } from "@/lib/engine/translationInput";

export const Route = createFileRoute("/api/translate-stream")({
  server: { handlers: { POST: async ({ request }) => {
    // Public, stateless translation, same limits as the existing public RPC.
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return new Response("Không được phép", { status: 403 });
    const data = TranslationInput.safeParse(await request.json().catch(() => null));
    if (!data.success) return new Response("Câu dịch không hợp lệ hoặc quá dài (tối đa 2000 ký tự).", { status: 400 });
    const { aiTranslateStream } = await import("@/lib/ai/translate.server");
    return aiTranslateStream(request, data.data);
  } } },
});