import { NestedReadyState, READYSTATE, ReadyStateNode } from '../types/ReadyState';

export type CacheUpdateHandler = (cacheState: NestedReadyState) => void;

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
  private _cache: Record<string, ReadyStateNode & { data?: string }> = {};
  private _abortController: AbortController | null = null;
  private _onCacheUpdate: CacheUpdateHandler;

  constructor({ maxSizeBytes, onCacheUpdate }: DataURICacheOptions) {
    this._maxSizeBytes = maxSizeBytes;
    this._onCacheUpdate = onCacheUpdate;
  }

  get cacheState(): NestedReadyState {
    return {
      items: Object.fromEntries(Object.entries(this._cache).map(([file, { data: _, state }]) => [file, { state }])),
    };
  }

  async cache(urls: string[]): Promise<void> {
    this._abortController?.abort();
    const controller = new AbortController();
    this._abortController = controller;

    const newURLs = new Set(urls);
    for (const prevURL of Object.keys(this._cache)) {
      if (!newURLs.has(prevURL)) {
        const staleEntry = this._cache[prevURL];
        if (staleEntry) {
          this._sizeBytes -= staleEntry.data?.length ?? 0;
          delete this._cache[prevURL];
        }
      }
    }

    this._onCacheUpdate(this.cacheState);

    for (const url of urls) {
      if (controller.signal.aborted) break;
      await this.cacheUrl(url, controller.signal);
      this._onCacheUpdate(this.cacheState);
    }
  }

  private async cacheUrl(url: string, signal: AbortSignal): Promise<void> {
    if (url in this._cache) return;
    this._cache[url] = { state: READYSTATE.IN_PROGRESS };

    if (signal.aborted) return;

    let uri: string;
    try {
      const response = await fetch(url, { signal });
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      const blob = await response.blob();
      uri = await createDataURI(blob);
    } catch (e) {
      this._cache[url] = { state: READYSTATE.DONE, errors: [String(e)] };
      return;
    }

    if (signal.aborted) return;
    if (this._sizeBytes + uri.length > this._maxSizeBytes) return;

    this._cache[url] = { state: READYSTATE.DONE, data: uri };
    this._sizeBytes += uri.length;
    return;
  }

  getURI(url: string): string | undefined {
    return this._cache[url]?.data;
  }

  destroy(): void {
    this._abortController?.abort();
    this._abortController = null;
    this._cache = {};
  }
}
