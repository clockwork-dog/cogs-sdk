import tseslint from "typescript-eslint";

/**
 * ESLint rules which are specific to packages built with Vite
 */
export default tseslint.config({
  ignores: ["public/"],
});
