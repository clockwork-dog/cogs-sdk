import eslint from '@eslint/js';
import tsEslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import eslintReactPlugin from 'eslint-plugin-react';
import globals from 'globals';

export default tsEslint.config(
  { ignores: ['dist/**/*'] },
  eslint.configs.recommended,
  tsEslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'],
    ...eslintReactPlugin.configs.flat.recommended,
    languageOptions: {
      ...eslintReactPlugin.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.browser,
      },
    },
    settings: {
      react: {
        version: '19',
      },
    },
  },
  {
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  eslintPluginPrettierRecommended,
);
