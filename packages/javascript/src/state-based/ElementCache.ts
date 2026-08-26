import { DataURICache, CacheUpdateHandler } from './DataURICache';

type TagNameWithSrc = {
  [Tag in keyof HTMLElementTagNameMap]: HTMLElementTagNameMap[Tag] extends { src: string } ? Tag : never;
}[keyof HTMLElementTagNameMap];

export interface ElementCacheOpts<TagName> {
  elementType: TagName;
  cacheUpdateHandler: CacheUpdateHandler;
  size: number;
}

export class ElementCache<TagName extends TagNameWithSrc> {
  private _dataURICache: DataURICache;
  private _type: TagName;
  constructor(opts: ElementCacheOpts<TagName>) {
    this._type = opts.elementType;
    this._dataURICache = new DataURICache({
      maxSizeBytes: opts.size,
      onCacheUpdate: opts.cacheUpdateHandler,
    });
  }

  preload(urls: string[]): Promise<void> {
    return this._dataURICache.cache(urls);
  }

  getElement(url: string): HTMLElementTagNameMap[TagName] {
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
