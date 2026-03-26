import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: [
        "src/lib/utils.ts",
        "src/lib/validators.ts",
        "src/lib/constants.ts",
        "src/lib/on-track-logic.ts",
        "src/lib/scorecard-parser.ts",
        "src/lib/dal/**/*.ts",
        "src/lib/actions/**/*.ts",
        "src/hooks/**/*.ts",
        "src/components/**/*.tsx",
      ],
      exclude: [
        "src/**/*.stories.tsx",
        "src/__mocks__/**",
        "src/types/**",
        "src/test/**",
      ],
    },
  },
});
