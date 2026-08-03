import '../types/AudioContext';
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
  constructor(constructAssetURL: (file: string) => string, testState: MediaClientConfig['files'] = {}) {
    this._constructAssetURL = constructAssetURL;
    this._state = testState;
    navigator?.mediaDevices?.addEventListener('devicechange', this._updateAudioOutputs);
  }

  get state() {
    return { ...this._state };
  }
  setState(newState: MediaClientConfig['files']) {
    this._state = newState;
    this.update();
  }

  getAudioContext(audioOutput: string): AudioContext {
    if (audioOutput === this._audioOutput) {
      this._audioContext.resume();
      return this._audioContext;
    } else {
      this._audioContext.close();
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
    this._audioContext.close();
    this._mediaPool = {};
    navigator?.mediaDevices?.removeEventListener('devicechange', this._updateAudioOutputs);
  }
}
