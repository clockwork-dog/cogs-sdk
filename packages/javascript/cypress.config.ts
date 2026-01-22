import { defineConfig } from 'cypress';
import z from 'zod';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp');

export default defineConfig({
  defaultBrowser: 'electron',
  component: {
    setupNodeEvents(on) {
      on('task', {
        'get-pixel-value': getPixelValue,
      });
    },
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
        'get-pixel-value': getPixelValue,
        log(message) {
          console.log(message);
          return null;
        },
      });
    },
  },
});

const getPixelValueArgs = z.object({
  id: z.string(),
  x: z.number().gte(0),
  y: z.number().gte(0),
});
async function getPixelValue(args: unknown) {
  try {
    const { id, x, y } = getPixelValueArgs.parse(args);
    const file = `cypress/screenshots/${id}.png`;

    // Approach derived from: https://github.com/lovell/sharp/issues/934#issuecomment-327181099
    const metadata = await sharp(file).metadata();
    const { channels, width } = metadata;
    const pixelOffset = channels * (width * y + x);

    const data = await sharp(file).raw().toBuffer();
    const r = data[pixelOffset + 0];
    const g = data[pixelOffset + 1];
    const b = data[pixelOffset + 2];

    return { r, g, b };
  } catch (e) {
    return e;
  }
}
