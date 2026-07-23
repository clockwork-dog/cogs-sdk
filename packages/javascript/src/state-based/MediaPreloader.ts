import '../types/AudioSinkTypes';

import { MediaClientConfig } from '../types/CogsClientMessage';
import { PHASE_VOCODER_PROCESSOR_NAME } from '../worklet/processorName';
import { PHASE_VOCODER_WORKLET_SOURCE } from '../worklet/generated/workletSource';

interface Media {
  element: HTMLMediaElement;
  type: 'audio' | 'video';
  inUse: boolean;
  gainNode: GainNode | undefined;
  pitchNode: AudioWorkletNode | undefined;
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

  // The API allows multiple simultaneous audioOutputs.
  // However we're only keeping a single AudioContext open at a time to improve performance
  private _audioOutput: string | undefined = undefined;
  private _audioContext: AudioContext = new AudioContext();
  private _workletRegistration: Promise<void> | undefined;

  private _audioOutputs: Record<string, string> = {};

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
      return this._audioContext;
    } else {
      this._audioContext.close();
      const ctx = new AudioContext();
      this._audioOutput = audioOutput;
      this._audioContext = ctx;
      this._workletRegistration = this.registerPhaseVocoderWorklet(ctx);
      const sinkId = this._audioOutputs[audioOutput] ?? '';
      ctx.setSinkId?.(sinkId);
      return ctx;
    }
  }

  private registerPhaseVocoderWorklet(ctx: AudioContext): Promise<void> {
    const blobUrl = URL.createObjectURL(new Blob([PHASE_VOCODER_WORKLET_SOURCE], { type: 'application/javascript' }));
    return ctx.audioWorklet
      .addModule(blobUrl)
      .catch((error) => console.error('Failed to register phase-vocoder worklet', error))
      .finally(() => URL.revokeObjectURL(blobUrl));
  }

  getGainNode(element: HTMLMediaElement): GainNode | undefined {
    for (const cache of Object.values(this._mediaPool)) {
      for (const media of Object.values(cache.connected)) {
        if (media.element === element) return media.gainNode;
      }
    }
  }

  getPitchNode(element: HTMLMediaElement): AudioWorkletNode | undefined {
    for (const cache of Object.values(this._mediaPool)) {
      for (const media of Object.values(cache.connected)) {
        if (media.element === element) return media.pitchNode;
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
            media.pitchNode?.disconnect();
          }
        }
        delete this._mediaPool[filename];
      }
    }

    // Create cache for new clips
    for (const [filename, fileConfig] of Object.entries(this._state)) {
      this._mediaPool[filename] ??= { spare: this.createMedia(filename, fileConfig.type), connected: {} };
    }
  }

  private createMedia(file: string, type: 'audio' | 'video'): Media {
    const element = document.createElement(type);
    element.src = this._constructAssetURL(file);
    element.preload = this.getPreloadAttr(file);
    element.preservesPitch = false;
    return { element, type, inUse: false, gainNode: undefined, pitchNode: undefined };
  }

  // Connects an element into the Web Audio graph. Must only be called once per element.
  private connectElement(media: Media, audioOutput: string) {
    const ctx = this.getAudioContext(audioOutput);
    const source = ctx.createMediaElementSource(media.element);
    const gainNode = ctx.createGain();
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    media.gainNode = gainNode;

    // Patch the pitch-correction worklet into the chain once this output's one-time
    // registration resolves; the first clip on a fresh output may briefly play uncorrected.
    this._workletRegistration?.then(() => {
      const pitchNode = new AudioWorkletNode(ctx, PHASE_VOCODER_PROCESSOR_NAME);
      source.disconnect(gainNode);
      source.connect(pitchNode);
      pitchNode.connect(gainNode);
      media.pitchNode = pitchNode;
    });
  }

  getElement(file: string, type: 'audio' | 'video', audioOutput: string) {
    const cache = this._mediaPool[file] ?? (this._mediaPool[file] = { connected: {}, spare: this.createMedia(file, type) });

    // Reuse element if already connected to audio graph
    const connectedMedia = cache.connected[audioOutput];
    if (connectedMedia && !connectedMedia.inUse) {
      connectedMedia.inUse = true;
      connectedMedia.gainNode?.connect(this._audioContext.destination);
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
        if (media.element === element) {
          media.inUse = false;
          media.gainNode?.disconnect();
        }
      }
    }
  }

  private _updateAudioOutputs = async () => {
    const audioOutputs: Record<string, string> = {};

    if (!navigator?.mediaDevices) {
      // `navigator.mediaDevices` is undefined on COGS AV <= 4.5 because of secure origin permissions
      return;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const outputs = devices.filter((device) => device.kind === 'audiooutput');
    outputs.forEach((output) => {
      audioOutputs[output.label] = output.deviceId;
    });

    this._audioOutputs = audioOutputs;
  };

  destroy() {
    this._audioContext.close();
    this._mediaPool = {};
    navigator?.mediaDevices?.removeEventListener('devicechange', this._updateAudioOutputs);
  }
}
