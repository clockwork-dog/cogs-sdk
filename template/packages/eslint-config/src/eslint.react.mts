import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";
import baseConfig from "./eslint.base.mts";

/**
 * ESLint rules which are specific to packages which use React
 */
export default tseslint.config(
  baseConfig,
  {
    ...reactPlugin.configs.flat.recommended,
    rules: {
      ...reactPlugin.configs.flat.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    languageOptions: {
      ...reactPlugin.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ...reactPlugin.configs.flat.recommended.languageOptions.parserOptions,
        jsxPragma: null, // for @typescript/eslint-parser
      },
    },
  },
  {
    ...reactHooks.configs["recommended-latest"],
    rules: {
      ...reactHooks.configs["recommended-latest"].rules,
      "react-hooks/exhaustive-deps": "error",
    },
  },
);
