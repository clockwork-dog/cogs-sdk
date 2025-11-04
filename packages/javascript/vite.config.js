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
    global: {},
  },
});
