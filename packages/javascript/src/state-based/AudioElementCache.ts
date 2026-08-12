import { BlobCache, CacheUpdateHandler } from './BlobCache';

const CACHE_SIZE = 200 * 1024 * 1024;

export class AudioElementCache {
  private _blobCache: BlobCache;
  constructor(cacheUpdateHandler: CacheUpdateHandler) {
    this._blobCache = new BlobCache({
      maxSizeBytes: CACHE_SIZE,
      onCacheUpdate: cacheUpdateHandler,
    });
  }

  preload(urls: string[]): Promise<void> {
    return this._blobCache.cache(urls);
  }

  getElement(url: string): { element: HTMLAudioElement; revoke: () => void } {
    const cacheHit = this._blobCache.getUrl(url);

    const { url: src, revoke } = cacheHit ?? {
      url,
      revoke: () => {
        /* do nothing */
      },
    };
    const element = document.createElement('audio');
    element.src = src;
    return { element, revoke };
  }

  destroy(): void {
    this._blobCache.destroy();
  }
}
