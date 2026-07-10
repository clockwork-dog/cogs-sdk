import { MediaClientConfig } from '../types/CogsClientMessage';

interface Media {
  element: HTMLMediaElement;
  type: 'audio' | 'video';
  inUse: boolean;
  gainNode: GainNode | undefined;
}

interface MediaPool {
  [fileName: string]: {
    spare: Media;
    connected: { [audioOutput: string]: Media };
  };
}

/**
 * Preloads audio and video to optimize time to playback.
 * Lazily connects media elements to the required AudioContext, and keeps a spare one unconnected.
 */
export class MediaPreloader {
  private _state: MediaClientConfig['files'];
  private _mediaPool: MediaPool = {};
  private _constructAssetURL: (file: string) => string;
  public audioContexts: Record<string, AudioContext> = {};
  constructor(constructAssetURL: (file: string) => string, testState: MediaClientConfig['files'] = {}) {
    this._constructAssetURL = constructAssetURL;
    this._state = testState;
  }

  get state() {
    return { ...this._state };
  }
  setState(newState: MediaClientConfig['files']) {
    this._state = newState;
    this.update();
  }

  getAudioContext(audioOutput: string): AudioContext {
    const ctx = this.audioContexts[audioOutput] ?? (this.audioContexts[audioOutput] = new AudioContext());
    ctx.resume();
    return ctx;
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
        for (const media of Object.values(cache.connected)) {
          if (media.inUse) {
            console.error(`Failed to clean up ${filename}`);
          } else {
            media.element.src = '';
            media.element.load();
            media.gainNode?.disconnect();
          }
        }
        delete this._mediaPool[filename];
      }
    }

    // Create cache for new clips
    for (const [filename, fileConfig] of Object.entries(this._state)) {
      const cache = this._mediaPool[filename];
      if (!cache || !cache.spare) {
        cache.spare = this.createMedia(filename, fileConfig.type);
      }
    }
  }

  private createMedia(file: string, type: 'audio' | 'video'): Media {
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

  destroy() {
    Object.values(this.audioContexts).forEach((ctx) => ctx.close());
    this.audioContexts = {};
    this._mediaPool = {};
  }
}
