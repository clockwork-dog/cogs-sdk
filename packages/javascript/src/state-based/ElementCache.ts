import { BlobCache, CacheUpdateHandler } from './BlobCache';

export interface ElementCacheOpts {
  elementType: 'image' | 'audio';
  cacheUpdateHandler: CacheUpdateHandler;
  size: number;
}

export class ElementCache {
  private _blobCache: BlobCache;
  constructor(opts: ElementCacheOpts) {
    this._blobCache = new BlobCache({
      maxSizeBytes: opts.size,
      onCacheUpdate: opts.cacheUpdateHandler,
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
