import eslint from "@eslint/js";
import vitest from "@vitest/eslint-plugin";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * The base ESLint rules used by all packages
 */
export default tseslint.config(
  { ignores: ["node_modules/", "dist/"] },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: [
      "**/*.{test,spec}.?(c|m)[jt]s?(x)",
      "**/__tests__/**/*.?(c|m)[jt]s?(x)",
    ],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      "vitest/no-disabled-tests": "error",
      "vitest/no-focused-tests": "error",
    },
  },
  {
    files: ["**/*.cjs"],
    languageOptions: {
      globals: {
        ...globals.commonjs,
      },
    },
  },
  eslintPluginPrettierRecommended,
);
