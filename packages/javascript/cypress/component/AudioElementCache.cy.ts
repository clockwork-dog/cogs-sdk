import { AudioElementCache } from '../../src/state-based/AudioElementCache';
import { CacheUpdateHandler } from '../../src/state-based/BlobCache';
import { CacheState } from '../../src/types/cache';
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

const noopHandler = () => {
  /* do nothing*/
};

let cleanup: () => void = () => {
  /* replace with cleanup */
};

describe('AudioElementCache', () => {
  beforeEach(() => cleanup());

  it('is slow without a warm cache', async () => {
    const cache = new AudioElementCache(noopHandler);
    const url = createTestURL('sinwave@440hz.wav', { delayMs: 500 });

    const { element, revoke } = cache.getElement(url);
    cleanup = revoke;

    const timeToPlaying = await playAndMeasureTimeToPlaying(element);
    expect(timeToPlaying).to.be.at.least(500);
  });

  it('speeds up cached playback', async () => {
    const cache = new AudioElementCache(noopHandler);
    const url = createTestURL('sinwave@440hz.wav', { delayMs: 500 });

    await cache.preload([url]);

    const { element, revoke } = cache.getElement(url);
    cleanup = revoke;

    const timeToPlaying = await playAndMeasureTimeToPlaying(element);
    expect(timeToPlaying).to.be.lessThan(200);
  });

  it('gracefully handles failed fetches', async () => {
    const cache = new AudioElementCache(noopHandler);
    const url = createTestURL('sinwave@440hz.wav', { fail: true });

    await cache.preload([url]);

    const { element, revoke } = cache.getElement(url);
    cleanup = revoke;

    expect(element.tagName).to.equal('AUDIO');
    expect(element.src).to.equal(url);
  });

  it("doesn't break an element already playing from that URL when revoked", async () => {
    const cache = new AudioElementCache(noopHandler);
    const url = createTestURL('sinwave@440hz.wav');

    await cache.preload([url]);

    const { element, revoke } = cache.getElement(url);
    cleanup = revoke;
    await playAndMeasureTimeToPlaying(element);

    expect(element.paused).to.equal(false);
  });

  it('updates cache progress', async () => {
    const updates: { [url: string]: CacheState }[] = [];
    const handler: CacheUpdateHandler = (cacheState) => {
      updates.push(cacheState);
    };

    const cache = new AudioElementCache(handler);
    const url = createTestURL('sinwave@440hz.wav');
    await cache.preload([url]);

    const audioElement = cache.getElement(url);
    expect(audioElement.element.src).not.to.equal(url, 'Cache was not used and element does not have a blob src');

    expect(updates).to.have.length(2);
    expect(updates[0]!).to.deep.equal({});
    expect(updates[1]!).to.deep.equal({
      'http://localhost:4567/sinwave@440hz.wav': { readyState: HTMLMediaElement.HAVE_ENOUGH_DATA, cachedBytes: 1764042 },
    });
  });
});
