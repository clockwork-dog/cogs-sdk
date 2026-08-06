import { BlobCache } from './BlobCache';

export class AudioBlobCache {
  private _blobCache = new BlobCache();

  preFetch(urls: string[]): Promise<void> {
    return this._blobCache.preFetch(urls);
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
