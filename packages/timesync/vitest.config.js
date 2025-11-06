import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: 'src/**/*.test.ts',
    typecheck: {
      tsconfig: 'tsconfig.test.json',
    },
  },
});
