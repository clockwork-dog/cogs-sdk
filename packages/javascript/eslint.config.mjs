import eslint from '@eslint/js';
import tsEslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default tsEslint.config(
  { ignores: ['dist/**/*'] },
  eslint.configs.recommended,
  tsEslint.configs.recommended,
  {
    rules: {
      'no-console': 'off',
      'no-useless-constructor': 'off',
      'no-unused-vars': 'off',
      'no-empty-function': 'off',
      'no-else-return': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-useless-constructor': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-empty-function': 'error',
    },
  },
  eslintPluginPrettierRecommended,
);
