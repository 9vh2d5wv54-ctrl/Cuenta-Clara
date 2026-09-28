import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests for the money math, Clara's tools and the translations.
// Run: npm test (once) or npm run test:watch (while editing).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node" },
});
