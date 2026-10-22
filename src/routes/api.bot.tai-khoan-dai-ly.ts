import { createFileRoute } from "@tanstack/react-router";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

/**
 * POST /api/bot/tai-khoan-dai-ly - chỉ Javis gọi, kèm Authorization: Bearer <BOT_DEALER_SECRET>.
 * Body: { garageName, phone, confirmedBy, zaloThread? }. Chi tiết trong src/lib/bot-dealer.server.ts.
 */
export const Route = createFileRoute("/api/bot/tai-khoan-dai-ly")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { secretMatches, parseInput, createDealerAccount } = await import(
          "@/lib/bot-dealer.server"
        );
        const secret = process.env["BOT_DEALER_SECRET"];
        if (!secret) return json({ ok: false, error: "Chưa bật tính năng." }, 503);
        if (!secretMatches(request.headers.get("authorization"), secret))
          return json({ ok: false, error: "Không có quyền." }, 401);

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ ok: false, error: "Dữ liệu không đọc được." }, 400);
        }
        const input = parseInput(raw);
        if (typeof input === "string") return json({ ok: false, error: input }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await createDealerAccount(supabaseAdmin as any, input);
        return json(result, result.ok ? 200 : result.code);
      },
    },
  },
});
