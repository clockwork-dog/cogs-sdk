import { spawn } from 'node:child_process';
const ffmpeg = 'ffmpeg';

const child = spawn(ffmpeg, [
  // Set the input framerate
  '-framerate',
  '60',
  // Specify the input files
  '-i',
  'cypress/screenshots/generate-test-video-frames.cy.ts/%d.png',
  // Set the output framerate
  '-r',
  '60',
  // specify the codec
  '-c:v',
  'libx264',
  // pixel format
  '-pix_fmt',
  'yuv420p',
  // automatically overwrite
  '-y',
  // destination
  'out.mp4',
]);

child.stdout.on('data', (data) => console.log(data.toString()));
child.stderr.on('data', (data) => console.error(data.toString()));

child.on('error', () => {
  console.error('Failed to generate video');
  process.exit(1);
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('Created video');
  } else {
    console.error('Failed to create video');
  }
});
