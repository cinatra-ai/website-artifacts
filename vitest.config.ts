import { defineConfig } from "vitest/config";

// The renderer is exercised without a browser: pure model logic runs in Node,
// and the React components are checked via `react-dom/server` static markup, so
// no jsdom/DOM environment is needed. esbuild's automatic JSX transform handles
// the .tsx sources (jsxImportSource defaults to the shared React).
//
// Tests live in a top-level `tests/` tree, OUTSIDE the published `src/` payload
// (package.json `files: ["src"]`): the release packlist gate refuses any
// `__tests__/`/test path in the tarball, so test sources must never sit under a
// shipped directory.
export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
