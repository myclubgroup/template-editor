// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";

function buildInfoPlugin() {
  let info;

  try {
    const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));
    let commit = "unknown";
    try {
      commit = execSync("git rev-parse --short HEAD").toString().trim();
    } catch {
      // not a git repo or git not available
    }
    info = {
      version: pkg.version || "0.0.0",
      commit,
      buildTime: new Date().toISOString(),
    };
  } catch {
    info = {
      version: "0.0.0",
      commit: "unknown",
      buildTime: new Date().toISOString(),
    };
  }

  return {
    name: "build-info",
    // Make __BUILD_INFO__ available to your app at build time
    config() {
      return { define: { __BUILD_INFO__: JSON.stringify(info) } };
    },
    // Also drop files in the output for ops/debugging
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "build-info.json",
        source: JSON.stringify(info, null, 2),
      });
      this.emitFile({
        type: "asset",
        fileName: "BUILD.txt",
        source:
          `version=${info.version}\n` + `commit=${info.commit}\n` + `buildTime=${info.buildTime}\n`,
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), buildInfoPlugin(), tailwindcss()],
  base: "/template-editor/", // ← repo name with slashes
});
