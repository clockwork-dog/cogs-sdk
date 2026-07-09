import { SurfaceManager } from '../../src/state-based/SurfaceManager';

const constructAssetURL = (file: string) => `http://localhost:5173/__cypress/iframes/cypress/fixtures/${file}`;
const getAudioOutput = () => '';

const EXPECTED_HZ = 440;
const HZ_TOLERANCE = 10;
const MIN_PEAK_MAGNITUDE = 200; // 0-255

async function detectDominantFrequency(mediaElement: HTMLMediaElement): Promise<number | undefined> {
  const audioContext = new AudioContext();
  await audioContext.resume();

  const source = audioContext.createMediaElementSource(mediaElement);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 8192;
  source.connect(analyser);
  analyser.connect(audioContext.destination);

  // Give the audio graph time to actually process samples before reading the analyser -
  // right after connecting, its internal buffer is still empty/zeroed, and the analyser's
  await new Promise((resolve) => setTimeout(resolve, 500));

  const frequencyData = new Uint8Array(analyser.frequencyBinCount);
  let peakBin = 0;
  let peakMagnitude = 0;
  analyser.getByteFrequencyData(frequencyData);

  for (let bin = 0; bin < frequencyData.length; bin++) {
    if (frequencyData[bin] > peakMagnitude) {
      peakMagnitude = frequencyData[bin];
      peakBin = bin;
    }
  }

  return peakMagnitude > MIN_PEAK_MAGNITUDE ? (peakBin * audioContext.sampleRate) / analyser.fftSize : undefined;
}

async function assertDominant440HzTone(mediaElement: HTMLMediaElement) {
  const hz = await detectDominantFrequency(mediaElement);
  expect(hz, `dominant frequency should be ~${EXPECTED_HZ}Hz`).to.be.closeTo(EXPECTED_HZ, HZ_TOLERANCE);
}

describe('Audio frequency verification tests', () => {
  it('AudioManager plays a real, decoded 440Hz tone', () => {
    const now = Date.now();
    const manager = new SurfaceManager(constructAssetURL, getAudioOutput, {
      'clip-id': {
        type: 'audio',
        file: 'sinwave@440hz.wav',
        audioOutput: '',
        enablePlaybackRateAdjustment: true,
        keyframes: [[now, { set: { t: 0, rate: 1 } }]],
      },
    });
    cy.mount(manager);

    // wait to start playing
    cy.get('audio')
      .invoke('prop', 'currentTime')
      .should(($time) => expect(parseFloat($time)).to.be.greaterThan(0.1));

    cy.get('audio').then(($audio) => assertDominant440HzTone($audio.get(0) as HTMLAudioElement));
  });

  it('VideoManager plays a real, decoded 440Hz tone on its audio track', () => {
    const now = Date.now();
    const manager = new SurfaceManager(constructAssetURL, getAudioOutput, {
      'clip-id': {
        type: 'video',
        file: 'libx265~yuv420p~60fps~10s@3840x2160~440Hz.mp4',
        audioOutput: '',
        fit: 'cover',
        enablePlaybackRateAdjustment: true,
        keyframes: [[now, { set: { t: 0, rate: 1 } }]],
      },
    });
    cy.mount(manager);

    // wait to start playing
    cy.get('video')
      .invoke('prop', 'currentTime')
      .should(($time) => expect(parseFloat($time)).to.be.greaterThan(0.1));

    cy.get('video').then(($video) => assertDominant440HzTone($video.get(0) as HTMLVideoElement));
  });
});
