import { AudioBlobCache } from '../../src/state-based/AudioBlobCache';
import { createTestURL } from '../support/delayedFileServerConfig';

function playAndMeasureTimeToPlaying(element: HTMLAudioElement): Promise<number> {
  const startedAt = performance.now();
  document.body.append(element);
  element.play().catch(() => {
    /* do nothing */
  });

  return new Promise((resolve) => {
    if (element.currentTime > 0) {
      resolve(performance.now() - startedAt);
    } else {
      element.addEventListener('playing', () => resolve(performance.now() - startedAt), { once: true, passive: true });
    }
  });
}

let cleanup: () => void = () => {
  /* replace with cleanup */
};

describe('AudioBlobCache', () => {
  beforeEach(() => cleanup());

  it(`doesn't speed up new fetching`, async () => {
    const cache = new AudioBlobCache();
    const url = createTestURL('sinwave@440hz.wav', { delayMs: 200 });

    const { element, revoke } = cache.getElement(url);
    cleanup = revoke;

    const timeToPlaying = await playAndMeasureTimeToPlaying(element);
    expect(timeToPlaying).to.be.at.least(200);
  });

  it('speeds up cached playback', async () => {
    const cache = new AudioBlobCache();
    const url = createTestURL('sinwave@440hz.wav', { delayMs: 200 });

    await cache.preFetch([url]);

    const { element, revoke } = cache.getElement(url);
    cleanup = revoke;

    const timeToPlaying = await playAndMeasureTimeToPlaying(element);
    expect(timeToPlaying).to.be.lessThan(100);
  });

  it('gracefully handles failed fetches', async () => {
    const cache = new AudioBlobCache();
    const url = createTestURL('sinwave@440hz.wav', { fail: true });

    await cache.preFetch([url]);

    const { element, revoke } = cache.getElement(url);
    cleanup = revoke;

    expect(element.tagName).to.equal('AUDIO');
    expect(element.src).to.equal(url);
  });

  it("revoke() doesn't break an element already playing from that URL", async () => {
    const cache = new AudioBlobCache();
    const url = createTestURL('sinwave@440hz.wav');

    await cache.preFetch([url]);

    const { element, revoke } = cache.getElement(url);
    cleanup = revoke;
    await playAndMeasureTimeToPlaying(element);

    expect(element.paused).to.equal(false);
  });
});
