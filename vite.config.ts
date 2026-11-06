// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

// Build production (Vercel hoặc VITE_IMMERSIVE_DEMO=off): loại file demo khỏi bản build.
const stripDemo = process.env["VERCEL"] === "1" || process.env["VITE_IMMERSIVE_DEMO"] === "off";
const demoStripPlugin = {
  name: "sk-strip-immersive-demo",
  apply: "build" as const,
  closeBundle() {
    if (!stripDemo) return;
    for (const dir of ["dist", "dist/client", ".output/public", ".vercel/output/static"]) {
      const p = resolve(process.cwd(), dir, "demo");
      if (existsSync(p)) rmSync(p, { recursive: true, force: true });
    }
  },
};

export default defineConfig({
  vite: { plugins: [demoStripPlugin] },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
