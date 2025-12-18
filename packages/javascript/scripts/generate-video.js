import { spawn } from 'node:child_process';
const ffmpeg = 'ffmpeg';

const child = spawn(ffmpeg, [
  // Set the input framerate
  '-framerate',
  '60',
  // Specify the input files
  '-i',
  'packages/javascript/cypress/screenshots/generate-test-video.cy.ts/%d.png',
  // Set the output framerate
  '-r',
  '60',
  // idk?
  '-c:v',
  'libx264',
  '-pix_fmt',
  'yuv420p',
  'out.mp4',
]);

child.on('error', () => {
  console.error('Failed to generate video');
  process.exit(1);
});
