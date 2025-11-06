import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      name: 'COGS',
      entry: 'src/index.ts',
      fileName: 'index',
    },
    outDir: 'dist/browser',
  },
  define: {
    // Fixes HowlerGlobal: https://github.com/goldfire/howler.js/pull/1331
    global: {},
  },
});
