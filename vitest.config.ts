import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)));

export default defineConfig({
  test: {
    environment: "node",
    include: ["__tests__/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": root,
    },
  },
});
