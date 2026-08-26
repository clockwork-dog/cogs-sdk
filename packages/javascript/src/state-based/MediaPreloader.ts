import '../types/AudioContext';
import { CacheState } from '../types/cache';
import { MediaClientConfig } from '../types/CogsClientMessage';
import { ElementCache } from './ElementCache';

export type MediaCacheState = {
  images: Record<string, CacheState>;
  audio: Record<string, CacheState>;
  video: Record<string, CacheState>;
};
export type MediaCacheUpdateHandler = (state: MediaCacheState) => void;

interface Media {
  type: 'image' | 'audio' | 'video';
  element: HTMLMediaElement | HTMLImageElement;
  inUse: boolean;
  gainNode: GainNode | undefined;
}

interface MediaPool {
  [fileName: string]: {
    spare: Media;
    connected: { [audioOutput: string]: Media };
  };
}

const DEFAULT_AUDIO_OUTPUT = '';
const AUDIO_CACHE_SIZE = 200 * 1024 * 1024;
const IMAGE_CACHE_SIZE = 100 * 1024 * 1024;

/**
 * Preloads audio and video to optimize time to playback.
 * Lazily connects media elements to the required AudioContext, and keeps a spare one unconnected.
 */
export class MediaPreloader {
  private _state: MediaClientConfig['files'];
  private _mediaPool: MediaPool = {};
  private _constructAssetURL: (file: string) => string;
  private _audioOutputIds: Record<string, string> = {};
  private _audioContext: AudioContext = new AudioContext();
  private _audioOutput: string = DEFAULT_AUDIO_OUTPUT;

  private _audioElementCache: ElementCache<'audio'>;
  private _imageElementCache: ElementCache<'img'>;
  private _fileCacheState: MediaCacheState = { images: {}, audio: {}, video: {} };
  private _assetFileLookup: Record<string, string> = {};

  constructor(
    constructAssetURL: (file: string) => string,
    onCacheUpdate: MediaCacheUpdateHandler = () => {
      /* do nothing */
    },
    testState: MediaClientConfig['files'] = {},
  ) {
    this._constructAssetURL = constructAssetURL;
    this._state = testState;
    navigator?.mediaDevices?.addEventListener('devicechange', this._updateAudioOutputs);

    this._imageElementCache = new ElementCache({
      elementType: 'img',
      size: IMAGE_CACHE_SIZE,
      cacheUpdateHandler: (state) => {
        const imageFileCacheState: Record<string, CacheState> = {};
        Object.entries(state).forEach(([url, cacheState]) => {
          const filename = this._assetFileLookup[url];
          if (filename) {
            imageFileCacheState[filename] = cacheState;
          }
        });
        this._fileCacheState.images = imageFileCacheState;
        onCacheUpdate(this._fileCacheState);
      },
    });

    this._audioElementCache = new ElementCache({
      elementType: 'audio',
      size: AUDIO_CACHE_SIZE,
      cacheUpdateHandler: (state) => {
        const audioFileCacheState: Record<string, CacheState> = {};
        Object.entries(state).forEach(([url, cacheState]) => {
          const filename = this._assetFileLookup[url];
          if (filename) {
            audioFileCacheState[filename] = cacheState;
          }
        });
        this._fileCacheState.audio = audioFileCacheState;
        onCacheUpdate(this._fileCacheState);
      },
    });
  }

  get state() {
    return { ...this._state };
  }
  setState(newState: MediaClientConfig['files']) {
    // Keep a lookup so later we can attribute a file for a given url
    this._assetFileLookup = {};
    Object.keys(newState).forEach((filename) => {
      const url = this._constructAssetURL(filename);
      this._assetFileLookup[url] = filename;
    });
    this._state = newState;
    this.update();
  }

  getAudioContext(audioOutput: string): AudioContext {
    if (audioOutput === this._audioOutput) {
      this._audioContext.resume();
      return this._audioContext;
    } else {
      if (this._audioContext.state !== 'closed') {
        this._audioContext.close();
      }
      const ctx = new AudioContext();
      this._audioOutput = audioOutput;
      this._audioContext = ctx;
      this._audioContext.resume();
      const sinkId = this._audioOutputIds[audioOutput] ?? '';
      ctx.setSinkId?.(sinkId);
      return ctx;
    }
  }

  getGainNode(element: HTMLMediaElement): GainNode | undefined {
    for (const cache of Object.values(this._mediaPool)) {
      for (const media of Object.values(cache.connected)) {
        if (media.element === element) return media.gainNode;
      }
    }
  }

  private getPreloadAttr(fileName: string): 'auto' | 'metadata' | 'none' {
    switch (this._state[fileName]?.preload) {
      case 'auto':
      case true:
        return 'auto';
      case 'metadata':
        return 'metadata';
      default:
        return 'none';
    }
  }

  private update() {
    // Remove stale elements
    for (const [filename, cache] of Object.entries(this._mediaPool)) {
      if (!(filename in this._state)) {
        cache.spare.element.src = '';
        if ('load' in cache.spare.element) {
          cache.spare.element.load();
        }
        for (const media of Object.values(cache.connected)) {
          if (media.inUse) {
            console.error(`Failed to clean up ${filename}`);
          } else {
            media.element.src = '';
            if ('load' in cache.spare.element) {
              cache.spare.element.load();
            }
            media.gainNode?.disconnect();
          }
        }
        delete this._mediaPool[filename];
      }
    }

    // Warm the caches for files that should be preloaded
    const audioUrlsToPreload = Object.entries(this._state)
      .filter(([filename, fileConfig]) => fileConfig.type === 'audio' && this.getPreloadAttr(filename) !== 'none')
      .map(([filename]) => this._constructAssetURL(filename));
    const imageUrlsToPreload = Object.entries(this._state)
      .filter(([filename, fileConfig]) => fileConfig.type === 'image' && this.getPreloadAttr(filename) !== 'none')
      .map(([filename]) => this._constructAssetURL(filename));
    Promise.all([this._audioElementCache.preload(audioUrlsToPreload), this._imageElementCache.preload(imageUrlsToPreload)]).then(() => {
      for (const [filename, fileConfig] of Object.entries(this._state)) {
        if (!(filename in this._mediaPool)) {
          this._mediaPool[filename] = { spare: this.createMedia(filename, fileConfig.type), connected: {} };
        }
      }
    });
  }

  private createMedia(file: string, type: 'image' | 'audio' | 'video'): Media {
    switch (type) {
      case 'image': {
        const element = this._imageElementCache.getElement(this._constructAssetURL(file)) as HTMLImageElement;
        return { element, type, inUse: false, gainNode: undefined };
      }
      case 'audio': {
        const element = this._audioElementCache.getElement(this._constructAssetURL(file)) as HTMLAudioElement;
        element.preload = this.getPreloadAttr(file);
        return { element, type, inUse: false, gainNode: undefined };
      }
      case 'video': {
        const element = document.createElement(type);
        element.src = this._constructAssetURL(file);
        element.preload = this.getPreloadAttr(file);
        return { element, type, inUse: false, gainNode: undefined };
      }
    }
  }

  // Connects an element into the Web Audio graph. Must only be called once per element.
  private connectElement(media: Media, audioOutput: string) {
    if (!(media.element instanceof HTMLMediaElement)) return;
    const ctx = this.getAudioContext(audioOutput);
    const source = ctx.createMediaElementSource(media.element);
    const gainNode = ctx.createGain();
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    media.gainNode = gainNode;
  }

  getElement(file: string, type: 'audio' | 'video', audioOutput: string) {
    const cache = this._mediaPool[file] ?? (this._mediaPool[file] = { connected: {}, spare: this.createMedia(file, type) });

    // Reuse element if already connected to audio graph
    const connectedMedia = cache.connected[audioOutput];
    if (connectedMedia && !connectedMedia.inUse) {
      connectedMedia.inUse = true;
      return connectedMedia.element;
    }

    // Use spare if available, connect to graph
    const ready = cache.spare;
    cache.spare = this.createMedia(file, type);
    ready.inUse = true;
    this.connectElement(ready, audioOutput);
    cache.connected[audioOutput] ??= ready;
    return ready.element;
  }

  releaseElement(element: HTMLMediaElement) {
    for (const cache of Object.values(this._mediaPool)) {
      for (const media of Object.values(cache.connected)) {
        if (media.element === element) media.inUse = false;
      }
    }
  }

  private _updateAudioOutputs = async () => {
    const audioOutputIds: Record<string, string> = {};

    if (!navigator?.mediaDevices) {
      // `navigator.mediaDevices` is undefined on COGS AV <= 4.5 because of secure origin permissions
      return;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const outputs = devices.filter((device) => device.kind === 'audiooutput');
    outputs.forEach((output) => {
      audioOutputIds[output.label] = output.deviceId;
    });

    this._audioOutputIds = audioOutputIds;
  };

  destroy() {
    if (this._audioContext.state !== 'closed') {
      this._audioContext.close();
    }
    this._mediaPool = {};
    this._audioElementCache.destroy();
    navigator?.mediaDevices?.removeEventListener('devicechange', this._updateAudioOutputs);
  }
}
