import { defineConfig } from 'cypress';

export default defineConfig({
  defaultBrowser: 'electron',
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  },

  viewportHeight: 720,
  viewportWidth: 1280,

  e2e: {
    setupNodeEvents(on) {
      // This is required to log progress to the terminal whilst generating frames
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
      });
    },
  },
});
