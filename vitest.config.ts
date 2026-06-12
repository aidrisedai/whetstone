import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts"],
      exclude: ["lib/anthropic.ts", "lib/clientApi.ts", "lib/demo.ts", "lib/prompts.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
