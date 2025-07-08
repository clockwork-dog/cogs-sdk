import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * ESLint rules which are specific to the COGS plugin manifest files
 */
export default tseslint.config({
  files: ["**/cogs-plugin-manifest.js"],
  languageOptions: {
    globals: {
      ...globals.commonjs,
    },
  },
});
