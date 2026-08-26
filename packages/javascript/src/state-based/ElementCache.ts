import { DataURICache, CacheUpdateHandler } from './DataURICache';

export interface ElementCacheOpts {
  elementType: 'image' | 'audio';
  cacheUpdateHandler: CacheUpdateHandler;
  size: number;
}

export class ElementCache {
  private _dataURICache: DataURICache;
  private _type: 'audio' | 'img';
  constructor(opts: ElementCacheOpts) {
    switch (opts.elementType) {
      case 'image':
        this._type = 'img';
        break;
      default:
        this._type = opts.elementType;
    }
    this._dataURICache = new DataURICache({
      maxSizeBytes: opts.size,
      onCacheUpdate: opts.cacheUpdateHandler,
    });
  }

  preload(urls: string[]): Promise<void> {
    return this._dataURICache.cache(urls);
  }

  getElement(url: string): HTMLElement {
    const cacheHit = this._dataURICache.getURI(url);
    const src = cacheHit ?? url;
    const element = document.createElement(this._type);
    element.src = src;
    return element;
  }

  destroy(): void {
    this._dataURICache.destroy();
  }
}
