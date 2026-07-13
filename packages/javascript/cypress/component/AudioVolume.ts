import { MediaPreloader } from '../../src/state-based/MediaPreloader';
import { SurfaceManager } from '../../src/state-based/SurfaceManager';

const constructAssetURL = (file: string) => `http://localhost:5173/__cypress/iframes/cypress/fixtures/${file}`;

const AUDIO_OUTPUT = ''; // Default
const EXPECTED_HZ = 440;
const HZ_ε = 10;
const MIN_VOLUME_SILENCE = 0.1;
const VOLUME_ε = 0.01;

async function analyzeAudio(audioContext: AudioContext, gainNode: GainNode): Promise<{ hz: number | undefined; volume: number }> {
  const fftSize = 8192;
  await audioContext.resume();

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

describe('Audio frequency verification tests', () => {
  it('plays a real 440Hz tone', () => {
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

    // wait to start playing
    cy.get('audio')
      .invoke('prop', 'currentTime')
      .should(($time) => expect(parseFloat($time)).to.be.greaterThan(0.1));

    cy.get('audio').then(async ($audio) => {
      const gainNode = preloader.getGainNode($audio.get(0) as HTMLAudioElement)!;
      const { hz } = await analyzeAudio(preloader.audioContexts[AUDIO_OUTPUT], gainNode);
      expect(hz).to.be.closeTo(EXPECTED_HZ, HZ_ε);
    });
  });

  it('plays a video with a real 440Hz tone', () => {
    const now = Date.now();
    const preloader = new MediaPreloader(constructAssetURL);
    const manager = new SurfaceManager(
      constructAssetURL,
      {
        'clip-id': {
          type: 'video',
          file: 'libx265~yuv420p~60fps~10s@3840x2160~440Hz.mp4',
          audioOutput: AUDIO_OUTPUT,
          fit: 'cover',
          enablePlaybackRateAdjustment: true,
          keyframes: [[now, { set: { t: 0, rate: 1 } }]],
        },
      },
      preloader,
    );
    cy.mount(manager);

    // wait to start playing
    cy.get('video')
      .invoke('prop', 'currentTime')
      .should(($time) => expect(parseFloat($time)).to.be.greaterThan(0.1));

    cy.get('video').then(async ($video) => {
      const gainNode = preloader.getGainNode($video.get(0) as HTMLVideoElement)!;
      const { hz } = await analyzeAudio(preloader.audioContexts[AUDIO_OUTPUT], gainNode);
      expect(hz).to.be.closeTo(EXPECTED_HZ, HZ_ε);
    });
  });

  it('changes volume', () => {
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
          keyframes: [[now, { set: { t: 0, rate: 1, volume: 1 } }]],
        },
      },
      preloader,
    );
    cy.mount(manager);

    let fullVolumePeak = 0;
    cy.get('audio')
      .invoke('prop', 'currentTime')
      .should(($time) => expect(parseFloat($time)).to.be.greaterThan(0.1))
      .then(async () => {
        const audioElement = manager.element.querySelector('audio')!;
        const gainNode = preloader.getGainNode(audioElement)!;
        const { volume } = await analyzeAudio(preloader.audioContexts[AUDIO_OUTPUT], gainNode);
        expect(volume, 'full clip volume should be clearly audible').to.be.greaterThan(MIN_VOLUME_SILENCE);
        fullVolumePeak = volume;
      })
      .then(() => {
        manager.setState({
          'clip-id': {
            type: 'audio',
            file: 'sinwave@440hz.wav',
            audioOutput: AUDIO_OUTPUT,
            enablePlaybackRateAdjustment: true,
            keyframes: [[now, { set: { t: 0, rate: 1, volume: 0.5 } }]],
          },
        });
      })
      .wait(200)
      .then(async () => {
        const audioElement = manager.element.querySelector('audio')!;
        const gainNode = preloader.getGainNode(audioElement)!;
        const { volume } = await analyzeAudio(preloader.audioContexts[AUDIO_OUTPUT], gainNode);
        expect(volume, 'volume at 0.2 should be at least 50% quieter').to.be.lessThan(fullVolumePeak);
      });
  });

  it('is silent when playing at 0 volume', () => {
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
          keyframes: [[now, { set: { t: 0, rate: 1, volume: 0 } }]],
        },
      },
      preloader,
    );
    cy.mount(manager);

    cy.get('audio')
      .invoke('prop', 'currentTime')
      .should(($time) => expect(parseFloat($time)).to.be.greaterThan(0.1));

    cy.get('audio').then(async ($audio) => {
      const gainNode = preloader.getGainNode($audio.get(0) as HTMLAudioElement)!;
      const { volume } = await analyzeAudio(preloader.audioContexts[AUDIO_OUTPUT], gainNode);
      expect(volume).to.be.closeTo(0, VOLUME_ε);
    });
  });
});
