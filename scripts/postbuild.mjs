// Normalizes build output: Lovable writes dist/client, plain CI (GitHub) writes .output/public.
// Ensures dist/client exists with the prerendered pages plus sw.js/workbox-*.js.
import { existsSync, cpSync, readdirSync, mkdirSync } from "node:fs";

const client = "dist/client";
if (!existsSync(`${client}/index.html`) && existsSync(".output/public/index.html")) {
  mkdirSync(client, { recursive: true });
  cpSync(".output/public", client, { recursive: true });
}
if (!existsSync(client)) {
  console.error("No client build output found (dist/client or .output/public)");
  process.exit(1);
}
if (existsSync("dist")) {
  for (const f of readdirSync("dist")) {
    if (f === "sw.js" || /^workbox-.*\.js$/.test(f)) cpSync(`dist/${f}`, `${client}/${f}`);
  }
}
