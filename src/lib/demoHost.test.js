import { describe, it, expect } from "vitest";
import { isPreviewHost } from "@/routes/demo.immersive";
describe("demo chỉ bật trên Preview", () => {
  it("bật trên preview", () => {
    for (const h of ["id-preview--b58bebac-6389-49b8-812e-35c9fb59a49a.lovable.app","id-preview-6--b58bebac-6389-49b8-812e-35c9fb59a49a.lovable.app","preview--carcat-explorer.lovable.app","b58bebac-6389-49b8-812e-35c9fb59a49a.lovableproject.com","localhost"]) expect(isPreviewHost(h)).toBe(true);
  });
  it("tắt trên production", () => {
    for (const h of ["carcat-explorer.lovable.app","catalog.sklight.vn","sklight.vercel.app","evil.com"]) expect(isPreviewHost(h)).toBe(false);
  });
});
