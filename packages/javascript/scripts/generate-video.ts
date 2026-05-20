import { spawn } from 'node:child_process';
const ffmpeg = 'ffmpeg';

/**
 * - First make sure cypress/screenshots is empty
 *   This is the directory we'll use to save all video frames
 *   $ rm -rf cypress/screenshots/*
 * - Then run `yarn cy:generate`
 *   This will run the generate procedure in the e2e test
 *   It will save screenshots to cypress/screenshots
 * - Finally run this file to create a test video
 */

const child = spawn(ffmpeg, [
  // Set the input framerate
  '-framerate',
  '60',
  // Specify the input image files
  '-i',
  'cypress/screenshots/%d.png',
  // Specify the input audio
  '-i',
  'cypress/fixtures/metronome@120bpm.wav',
  // Cut the audio track to length (1min to 10s)
  '-shortest',
  // Set the output framerate
  '-r',
  '60',
  // Specify the video codec
  '-c:v',
  'libx265',
  // Specify the audio codec
  '-c:a',
  'aac',
  // Specify the pixel format
  '-pix_fmt',
  'yuv420p',
  // Automatically overwrite
  '-y',
  // Destination
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
    process.exit(code ?? 1);
  }
});
