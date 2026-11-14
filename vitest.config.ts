import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests for pure logic (time zones, allow-list, funds, flights), plus the
// paid flight-API server functions against a mocked fetch and session.
// Kept separate from vite.config.ts so the SolidStart/Nitro plugins don't load.
export default defineConfig({
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./src", import.meta.url)),
      // SolidStart resolves this marker itself; tests just need it to exist.
      "server-only": fileURLToPath(new URL("./src/test/empty-module.ts", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
