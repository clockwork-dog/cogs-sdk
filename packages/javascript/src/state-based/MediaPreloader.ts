import '../types/AudioContext';
import { CacheState } from '../types/cache';
import { MediaClientConfig } from '../types/CogsClientMessage';
import { AudioElementCache } from './AudioElementCache';
import { CacheUpdateHandler } from './BlobCache';

interface Media {
  type: 'audio' | 'video';
  element: HTMLMediaElement;
  inUse: boolean;
  gainNode: GainNode | undefined;
  revoke?: () => void;
}

interface MediaPool {
  [fileName: string]: {
    spare: Media;
    connected: { [audioOutput: string]: Media };
  };
}

const DEFAULT_AUDIO_OUTPUT = '';

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
  private _audioElementCache: AudioElementCache;
  private _assetFileLookup: Record<string, string> = {};

  constructor(
    constructAssetURL: (file: string) => string,
    onCacheUpdate: CacheUpdateHandler = () => {
      /* do nothing */
    },
    testState: MediaClientConfig['files'] = {},
  ) {
    this._constructAssetURL = constructAssetURL;
    this._state = testState;
    navigator?.mediaDevices?.addEventListener('devicechange', this._updateAudioOutputs);

    // Translate the URL cache state back to filenames as keys
    this._audioElementCache = new AudioElementCache((urlCacheState) => {
      const fileCacheState: Record<string, CacheState> = {};
      Object.entries(urlCacheState).forEach(([url, cacheState]) => {
        const filename = this._assetFileLookup[url];
        if (filename) {
          fileCacheState[filename] = cacheState;
        }
      });
      onCacheUpdate(fileCacheState);
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
        cache.spare.element.load();
        cache.spare.revoke?.();
        for (const media of Object.values(cache.connected)) {
          if (media.inUse) {
            console.error(`Failed to clean up ${filename}`);
          } else {
            media.element.src = '';
            media.element.load();
            media.gainNode?.disconnect();
            media.revoke?.();
          }
        }
        delete this._mediaPool[filename];
      }
    }

    // Create cache for new clips
    for (const [filename, fileConfig] of Object.entries(this._state)) {
      if (!(filename in this._mediaPool)) {
        this._mediaPool[filename] = { spare: this.createMedia(filename, fileConfig.type), connected: {} };
      }
    }

    // Warm the blob cache for audio files that should be preloaded
    const audioUrlsToPreload = Object.entries(this._state)
      .filter(([filename, fileConfig]) => fileConfig.type === 'audio' && this.getPreloadAttr(filename) !== 'none')
      .map(([filename]) => this._constructAssetURL(filename));
    void this._audioElementCache.preload(audioUrlsToPreload);
  }

  private createMedia(file: string, type: 'audio' | 'video'): Media {
    if (type === 'audio') {
      const { element, revoke } = this._audioElementCache.getElement(this._constructAssetURL(file));
      element.preload = this.getPreloadAttr(file);
      return { element, type, inUse: false, gainNode: undefined, revoke };
    }

    const element = document.createElement(type);
    element.src = this._constructAssetURL(file);
    element.preload = this.getPreloadAttr(file);
    return { element, type, inUse: false, gainNode: undefined };
  }

  // Connects an element into the Web Audio graph. Must only be called once per element.
  private connectElement(media: Media, audioOutput: string) {
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
    for (const cache of Object.values(this._mediaPool)) {
      cache.spare.revoke?.();
      for (const media of Object.values(cache.connected)) {
        media.revoke?.();
      }
    }
    this._mediaPool = {};
    this._audioElementCache.destroy();
    navigator?.mediaDevices?.removeEventListener('devicechange', this._updateAudioOutputs);
  }
}
