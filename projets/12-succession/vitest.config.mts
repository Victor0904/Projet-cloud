import { defineConfig } from "vitest/config";

// tsconfig garde « jsx: preserve » pour Next.js ; les tests ont besoin d'une transformation JSX.
export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
});
