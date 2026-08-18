import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";

/*
 * Which build a report came from. CI supplies the commit; a local run asks
 * git, and falls back to "dev" outside a checkout.
 */
const build = (() => {
  const sha = process.env.GITHUB_SHA;
  if (sha) return sha.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString().trim();
  } catch {
    return "dev";
  }
})();

export default defineConfig({
  /*
   * Served from https://<user>.github.io/planner/, so assets resolve under
   * that subpath rather than the domain root. Routing is hash-based, so the
   * routes themselves need no server config — only the assets do.
   */
  base: process.env.BASE_PATH ?? "/",
  plugins: [react()],
  define: { __BUILD__: JSON.stringify(build) },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    hmr: { protocol: "wss", clientPort: 443 },
  },
});
