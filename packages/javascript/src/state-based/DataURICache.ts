import { CacheState } from '../types/cache';

export type CacheUpdateHandler = (cacheState: { [url: string]: CacheState }) => void;

export interface DataURICacheOptions {
  maxSizeBytes: number;
  onCacheUpdate: CacheUpdateHandler;
}

function createDataURI(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Fetches files and holds them as `dataURI`s
 *
 * We've found that dataURIs take around 30% more space than a Blob,
 * but achieve a much quicker time to play.
 * @see {@link https://issues.chromium.org/issues/41324363}
 */
export class DataURICache {
  private _sizeBytes = 0;
  private _maxSizeBytes: number;
  private _cache: Record<string, string> = {};
  private _abortController: AbortController | null = null;
  private _onCacheUpdate: CacheUpdateHandler;

  constructor({ maxSizeBytes, onCacheUpdate }: DataURICacheOptions) {
    this._maxSizeBytes = maxSizeBytes;
    this._onCacheUpdate = onCacheUpdate;
  }

  get cacheState(): { [url: string]: CacheState } {
    return Object.fromEntries<CacheState>(
      Object.entries(this._cache).map(([url, uri]): [string, CacheState] => [
        url,
        { readyState: HTMLMediaElement.HAVE_ENOUGH_DATA, cachedBytes: uri.length },
      ]),
    );
  }

  async cache(urls: string[]): Promise<void> {
    this._abortController?.abort();
    const controller = new AbortController();
    this._abortController = controller;

    const newURLs = new Set(urls);
    for (const prevURL of Object.keys(this._cache)) {
      if (!newURLs.has(prevURL)) {
        const staleURI = this._cache[prevURL];
        if (staleURI) {
          this._sizeBytes -= staleURI.length;
          delete this._cache[prevURL];
        }
      }
    }

    this._onCacheUpdate(this.cacheState);

    for (const url of urls) {
      if (controller.signal.aborted) break;
      let success = false;
      try {
        success = await this.cacheUrl(url, controller.signal);
      } finally {
        if (success) {
          this._onCacheUpdate(this.cacheState);
        } else {
          console.warn(`Failed to cache ${url}`);
        }
      }
    }
  }

  private async cacheUrl(url: string, signal: AbortSignal): Promise<boolean> {
    if (signal.aborted) return false;
    if (url in this._cache) return true;

    let uri: string;
    try {
      const response = await fetch(url, { signal });
      if (!response.ok) return false;
      const blob = await response.blob();
      uri = await createDataURI(blob);
    } catch {
      return false;
    }

    if (signal.aborted) return false;
    if (this._sizeBytes + uri.length > this._maxSizeBytes) return false;

    this._cache[url] = uri;
    this._sizeBytes += uri.length;
    return true;
  }

  getURI(url: string): string | undefined {
    return this._cache[url];
  }

  destroy(): void {
    this._abortController?.abort();
    this._abortController = null;
    this._cache = {};
  }
}
