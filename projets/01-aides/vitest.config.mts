import { defineConfig } from "vitest/config";

// tsconfig garde le JSX tel quel pour Next.js ; Vitest doit, lui, le transformer.
export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  test: { include: ["tests/**/*.test.{ts,tsx}"] },
});
