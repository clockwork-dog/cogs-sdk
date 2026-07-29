const CACHE_SIZE = 200 * 1024 * 1024;

/**
 * Fetches files and holds them as `Blob`s so they can be served back out as object URLs with
 */
export class BlobCache {
  private _size = 0;
  private _cache = new Map<string, Blob>();
  private _activeAbort: AbortController | null = null;

  async preFetch(urls: string[]): Promise<void> {
    this._activeAbort?.abort();

    const controller = new AbortController();
    this._activeAbort = controller;

    const newURLs = new Set(urls);
    for (const prevURL of this._cache.keys()) {
      if (!newURLs.has(prevURL)) {
        const staleBlob = this._cache.get(prevURL);
        if (staleBlob) {
          this._size -= staleBlob.size;
          this._cache.delete(prevURL);
        }
      }
    }

    const abortRejection = new Promise<never>((_resolve, reject) => {
      controller.signal.addEventListener('abort', () => reject(new Error('preFetch superseded by a newer call')));
    });

    try {
      await Promise.race([this._runPreFetch(urls, controller.signal), abortRejection]);
    } finally {
      if (this._activeAbort === controller) {
        this._activeAbort = null;
      }
    }
  }

  private async _runPreFetch(urls: string[], signal: AbortSignal): Promise<void> {
    for (const url of urls) {
      if (signal.aborted) return;
      if (this._cache.has(url)) continue;

      let blob: Blob;
      try {
        const response = await fetch(url, { signal });
        if (!response.ok) continue;
        blob = await response.blob();
      } catch {
        continue;
      }

      if (signal.aborted) return;
      if (this._size + blob.size > CACHE_SIZE) break;

      this._cache.set(url, blob);
      this._size += blob.size;
    }
  }

  getUrl(url: string): { url: string; revoke: () => void } | undefined {
    const blob = this._cache.get(url);
    if (blob) {
      const objectUrl = URL.createObjectURL(blob);
      return { url: objectUrl, revoke: () => URL.revokeObjectURL(objectUrl) };
    }
  }

  destroy(): void {
    this._activeAbort?.abort();
    this._activeAbort = null;
    this._cache.clear();
  }
}
