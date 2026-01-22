import { defineConfig } from 'cypress';
import z from 'zod';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp');

import { rename } from 'node:fs/promises';

export default defineConfig({
  defaultBrowser: 'electron',
  component: {
    setupNodeEvents(on) {
      //
      on('after:screenshot', flattenScreenshots);
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
      //
      on('after:screenshot', flattenScreenshots);
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
    console.debug('getPixelValue()', args);
    const { id, x, y } = getPixelValueArgs.parse(args);
    const path = `cypress/screenshots/${id}.png`;

    // Approach derived from: https://github.com/lovell/sharp/issues/934#issuecomment-327181099
    const metadata = await sharp(path).metadata();
    const { channels, width } = metadata;
    const pixelOffset = channels * (width * y + x);

    const data = await sharp(path).raw().toBuffer();
    const r = data[pixelOffset + 0];
    const g = data[pixelOffset + 1];
    const b = data[pixelOffset + 2];

    return { r, g, b };
  } catch (e) {
    console.error(e);
    return e;
  }
}

// If cypress is in interactive mode screenshots are saved in /screenshots/{name}.png
// If cypress is in run mode, screenshots are saved in /screenshots/{test-name}/{name}.png
const CYPRESS_SCREENSHOTS = 'cypress/screenshots';
async function flattenScreenshots(details: { path: string; specName: string }) {
  if (details.specName.length) {
    const newPath = details.path.replace(`${CYPRESS_SCREENSHOTS}/${details.specName}`, CYPRESS_SCREENSHOTS);
    await rename(details.path, newPath);
    return { path: newPath };
  }
  return details;
}
