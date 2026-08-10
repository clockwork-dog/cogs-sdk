export type BlobState = { totalBytes: number; cachedBytes: number };
export type CacheUpdateHandler = (cacheState: { [url: string]: BlobState }) => void;

export interface BlobCacheOptions {
  maxSizeBytes: number;
  onCacheUpdate: CacheUpdateHandler;
}

/**
 * Fetches files and holds them as `Blob`s so they can be served back out as object URLs with
 */
export class BlobCache {
  private _sizeBytes = 0;
  private _maxSizeBytes: number;
  private _cache: Record<string, Blob> = {};
  private _abortController: AbortController | null = null;
  private _onCacheUpdate: CacheUpdateHandler;

  constructor({ maxSizeBytes, onCacheUpdate }: BlobCacheOptions) {
    this._maxSizeBytes = maxSizeBytes;
    this._onCacheUpdate = onCacheUpdate;
  }

  get cacheState(): { [url: string]: BlobState } {
    return Object.fromEntries<BlobState>(
      Object.entries(this._cache).map(([url, blob]): [string, BlobState] => [url, { totalBytes: blob.size, cachedBytes: blob.size }]),
    );
  }

  async cache(urls: string[]): Promise<void> {
    this._abortController?.abort();
    const controller = new AbortController();
    this._abortController = controller;

    const newURLs = new Set(urls);
    for (const prevURL of Object.keys(this._cache)) {
      if (!newURLs.has(prevURL)) {
        const staleBlob = this._cache[prevURL];
        if (staleBlob) {
          this._sizeBytes -= staleBlob.size;
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

    let blob: Blob;
    try {
      const response = await fetch(url, { signal });
      if (!response.ok) return false;
      blob = await response.blob();
    } catch {
      return false;
    }

    if (signal.aborted) return false;
    if (this._sizeBytes + blob.size > this._maxSizeBytes) return false;

    this._cache[url] = blob;
    this._sizeBytes += blob.size;
    return true;
  }

  getUrl(url: string): { url: string; revoke: () => void } | undefined {
    const blob = this._cache[url];
    if (blob) {
      const objectUrl = URL.createObjectURL(blob);
      return { url: objectUrl, revoke: () => URL.revokeObjectURL(objectUrl) };
    }
  }

  destroy(): void {
    this._abortController?.abort();
    this._abortController = null;
    this._cache = {};
  }
}
