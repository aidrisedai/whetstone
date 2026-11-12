import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Route tests import handlers out of `app/api/**`, which reach for `@/lib/...`
 * the same way the Next build resolves it. Vitest doesn't read tsconfig paths,
 * so mirror the one alias here.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
