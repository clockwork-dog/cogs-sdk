import { MediaPreloader } from '../../src/state-based/MediaPreloader';
import { SurfaceManager } from '../../src/state-based/SurfaceManager';

const constructAssetURL = (file: string) => `http://localhost:5173/__cypress/iframes/cypress/fixtures/${file}`;

const AUDIO_OUTPUT = ''; // Default
const EXPECTED_HZ = 440;
const HZ_ε = 10;

async function analyzeAudio(audioContext: AudioContext, gainNode: GainNode): Promise<{ hz: number | undefined; volume: number }> {
  const fftSize = 8192;

  const analyser = audioContext.createAnalyser();
  analyser.fftSize = fftSize;
  gainNode.connect(analyser);

  // Give the audio graph time to actually process samples before reading the analyser -
  // right after connecting, its internal buffer is still empty/zeroed.
  await new Promise((resolve) => setTimeout(resolve, 500));

  const frequencyData = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(frequencyData);

  let peakBin = 0;
  let peakMagnitude = 0;
  for (let bin = 0; bin < frequencyData.length; bin++) {
    if (frequencyData[bin] > peakMagnitude) {
      peakMagnitude = frequencyData[bin];
      peakBin = bin;
    }
  }

  gainNode.disconnect(analyser);
  const volume = peakMagnitude / 255;
  const hz = volume > 0.1 ? (peakBin * audioContext.sampleRate) / fftSize : undefined;
  return { hz, volume };
}

describe('Pitch correction', () => {
  it('disables default pitch preservation', () => {
    const now = Date.now();
    const preloader = new MediaPreloader(constructAssetURL);
    const manager = new SurfaceManager(
      constructAssetURL,
      {
        'clip-id': {
          type: 'audio',
          file: 'sinwave@440hz.wav',
          audioOutput: AUDIO_OUTPUT,
          enablePlaybackRateAdjustment: true,
          keyframes: [[now, { set: { t: 0, rate: 1 } }]],
        },
      },
      preloader,
    );
    cy.mount(manager);

    cy.get('audio').should(($audio) => expect(($audio.get(0) as HTMLAudioElement).preservesPitch).to.equal(false));
  });

  it('raises pitch back to original tone', () => {
    const now = Date.now();
    const preloader = new MediaPreloader(constructAssetURL);
    const manager = new SurfaceManager(
      constructAssetURL,
      {
        'clip-id': {
          type: 'audio',
          file: 'sinwave@440hz.wav',
          audioOutput: AUDIO_OUTPUT,
          enablePlaybackRateAdjustment: true,
          keyframes: [[now, { set: { t: 0, rate: 0.9 } }]],
        },
      },
      preloader,
    );
    cy.mount(manager);

    // wait to start playing
    cy.get('audio')
      .invoke('prop', 'currentTime')
      .should(($time) => expect(parseFloat($time)).to.be.greaterThan(0.1));

    // Unmodified pitchFactor (still at its 1.0 AudioParam default): frequency stays at 440Hz.
    cy.get('audio').then(async ($audio) => {
      const audioElement = $audio.get(0) as HTMLAudioElement;
      const gainNode = preloader.getGainNode(audioElement)!;
      const { hz } = await analyzeAudio(preloader.audioContexts[AUDIO_OUTPUT], gainNode);
      expect(hz, 'default pitchFactor should not alter frequency').to.be.closeTo(EXPECTED_HZ, HZ_ε);
    });
  });

  it('lowers pitch back to original tone', () => {
    const now = Date.now();
    const preloader = new MediaPreloader(constructAssetURL);
    const manager = new SurfaceManager(
      constructAssetURL,
      {
        'clip-id': {
          type: 'audio',
          file: 'sinwave@440hz.wav',
          audioOutput: AUDIO_OUTPUT,
          enablePlaybackRateAdjustment: true,
          keyframes: [[now, { set: { t: 0, rate: 1.1 } }]],
        },
      },
      preloader,
    );
    cy.mount(manager);

    // wait to start playing
    cy.get('audio')
      .invoke('prop', 'currentTime')
      .should(($time) => expect(parseFloat($time)).to.be.greaterThan(0.1));

    // Unmodified pitchFactor (still at its 1.0 AudioParam default): frequency stays at 440Hz.
    cy.get('audio').then(async ($audio) => {
      const audioElement = $audio.get(0) as HTMLAudioElement;
      const gainNode = preloader.getGainNode(audioElement)!;
      const { hz } = await analyzeAudio(preloader.audioContexts[AUDIO_OUTPUT], gainNode);
      expect(hz, 'default pitchFactor should not alter frequency').to.be.closeTo(EXPECTED_HZ, HZ_ε);
    });
  });
});
