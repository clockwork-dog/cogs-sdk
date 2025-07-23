import sharedEslintConfig from "@repo/eslint-config/base";
import tseslint from "typescript-eslint";

export default tseslint.config([sharedEslintConfig]);
