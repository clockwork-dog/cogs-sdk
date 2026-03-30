import {
  AudialProperties,
  AudioState,
  ImageMetadata,
  ImageState,
  MediaClipState,
  TemporalProperties,
  VideoState,
  VisualProperties,
} from '../types/MediaSchema';
import { getStateAtTime } from '../utils/getStateAtTime';
import { MediaPreloader } from './MediaPreloader';

const getPath = (url: string): string | undefined => {
  try {
    const { pathname } = new URL(url, window.location.href);
    return pathname;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {
    return undefined;
  }
};

/**
 * Each instance of a MediaClipManager is responsible for displaying
 * an image/audio/video clip in the correct state.
 */
export abstract class MediaClipManager<T extends MediaClipState> {
  constructor(
    private surfaceElement: HTMLElement,
    protected clipElement: HTMLElement,
    state: T,
    protected constructAssetURL: (file: string) => string,
    protected getAudioOutput: (outputLabel: string) => string,
    protected mediaPreloader: MediaPreloader,
  ) {
    this._state = state;
  }

  protected abstract update(): void;
  public abstract destroy(): void;

  isConnected(element?: HTMLElement) {
    if (!this.surfaceElement) {
      return false;
    }
    if (!this.clipElement) {
      return false;
    }
    if (!this.surfaceElement.contains(this.clipElement)) {
      return false;
    }

    if (element) {
      if (!this.clipElement.contains(element)) return false;
    }

    return true;
  }

  protected _state: T;
  setState(newState: T) {
    this._state = newState;
  }

  private timeout: ReturnType<typeof setTimeout> | undefined;
  public loop = async () => {
    clearTimeout(this.timeout);
    if (this.isConnected()) {
      this.update();
      this.timeout = setTimeout(this.loop, INNER_TARGET_SYNC_THRESHOLD_MS);
    } else {
      this.destroy();
    }
  };
}

/**
 * Makes sure that the child media element exists and is of the correct type
 * - If it isn't or doesn't exist we'll get a new one
 * - If it is audio or video we'll try and get a preloaded media element
 * - Otherwise we'll directly create and set the src
 */
export function assertElement(
  mediaElement: HTMLMediaElement | HTMLImageElement | undefined,
  parentElement: HTMLElement,
  clip: MediaClipState,
  constructAssetURL: (file: string) => string,
  preloader: MediaPreloader,
): HTMLElement {
  let element: HTMLMediaElement | HTMLImageElement | undefined = undefined;
  const assetURL = constructAssetURL(clip.file);
  const assetPath = getPath(assetURL);

  switch (clip.type) {
    case 'image':
      {
        element = mediaElement instanceof HTMLImageElement ? mediaElement : document.createElement('img');
        const elementPath = getPath(element.src);
        if (elementPath !== assetPath) {
          element.src = assetURL;
        }
      }
      break;
    case 'audio':
    case 'video': {
      if (mediaElement !== undefined) {
        const path = getPath(mediaElement.src);
        if (mediaElement.tagName.toLowerCase() === clip.type && path !== undefined && path === assetPath) {
          element = mediaElement;
        }
      }

      if (!element) {
        element = preloader.getElement(clip.file, clip.type);
      }
      break;
    }
  }

  if (parentElement.children.length !== 1 || parentElement.childNodes[0] !== element) {
    parentElement.replaceChildren(element);
  }
  element.style.position = 'absolute';
  element.style.width = '100%';
  element.style.height = '100%';
  return element;
}

/**
 * Makes sure that the element looks correct.
 * - If the opacity, zIndex or fit are incorrect, we'll set again
 */
export function assertVisualProperties(
  mediaElement: HTMLMediaElement | HTMLImageElement,
  properties: VisualProperties,
  objectFit: ImageMetadata['fit'],
) {
  const opacityString = String(properties.opacity);
  if (mediaElement.style.opacity !== opacityString) {
    mediaElement.style.opacity = opacityString;
  }
  const zIndex = Math.round(properties.zIndex ?? 0);
  if (parseInt(mediaElement.style.zIndex) !== zIndex) {
    mediaElement.style.zIndex = String(zIndex);
  }
  if (mediaElement.style.objectFit !== objectFit) {
    mediaElement.style.objectFit = objectFit;
  }
}

/**
 * Makes sure that the element sounds correct.
 * - It should have the right volume, and play out the correct speaker.
 */
export function assertAudialProperties(mediaElement: HTMLMediaElement, properties: AudialProperties, sinkId: string, surfaceVolume: number) {
  const clipVolume = properties.volume * surfaceVolume;
  if (mediaElement.volume !== clipVolume) {
    mediaElement.volume = clipVolume;
  }
  if (mediaElement.sinkId !== sinkId) {
    try {
      mediaElement.setSinkId(sinkId).catch(() => {
        /* Do nothing, will be tried in next loop */
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      /* Do nothing, will be tried in next loop */
    }
  }
}

const OUTER_TARGET_SYNC_THRESHOLD_MS = 50; // When outside of this range we attempt to sync playback
const OUTER_TARGET_SYNC_NO_PLAYBACK_RATE_ADJUSTMENT_THRESHOLD_MS = 500; // When outside of this range we attempt to sync playback (when playback rate adjustment not allowed)
const INNER_TARGET_SYNC_THRESHOLD_MS = 5; // When attempting to sync playback, we aim for this accuracy
const MAX_SYNC_THRESHOLD_MS = 1_000; // If we are further than this, we will seek instead
const SEEK_LOOKAHEAD_MS = 5; // If it takes time to seek, we should seek ahead a little
const LOOPING_EPSILON_MS = 5;
const PLAYBACK_ADJUSTMENT_SMOOTHING = 0.3;
const MAX_PLAYBACK_RATE_ADJUSTMENT = 0.1;
function playbackSmoothing(deltaTime: number) {
  return Math.sign(deltaTime) * Math.pow(Math.abs(deltaTime) / MAX_SYNC_THRESHOLD_MS, PLAYBACK_ADJUSTMENT_SMOOTHING) * MAX_PLAYBACK_RATE_ADJUSTMENT;
}

interface TemporalSyncState {
  state: 'idle' | 'seeking' | 'intercepting';
}

/**
 * Makes sure the media is at the correct time and speed.
 * - If we fall slightly behind, we will lightly adjust the speed to catch up.
 * - If we are too far away to smoothly realign, we will seek to the correct time.
 */
export function assertTemporalProperties(
  mediaElement: HTMLMediaElement,
  properties: TemporalProperties,
  keyframes: VideoState['keyframes'],
  syncState: TemporalSyncState,
  disablePlaybackRateAdjustment?: boolean,
): TemporalSyncState {
  if (mediaElement.paused && properties.rate > 0) {
    mediaElement.play().catch(() => {
      /* Do nothing, will be tried in next loop */
    });
  }

  // At the end of the media, is it set back to the start?
  // Sounds like looping to me!
  if (mediaElement.duration) {
    const nextTemporalKeyframe = keyframes.filter(([t, kf]) => t > properties.t && (kf?.set?.t !== undefined || kf?.set?.rate !== undefined))[0];
    if (nextTemporalKeyframe?.[1]?.set?.t === 0) {
      const timeRemaining = (mediaElement.duration - properties.t) / properties.rate;
      const timeUntilKeyframe = nextTemporalKeyframe[0] - properties.t;
      const isLooping = Math.abs(timeRemaining - timeUntilKeyframe) <= LOOPING_EPSILON_MS;
      if (mediaElement.loop !== isLooping) {
        mediaElement.loop = isLooping;
      }
    }
  }

  const currentTime = mediaElement.currentTime * 1000;
  const deltaTime = currentTime - properties.t;
  const deltaTimeAbs = Math.abs(deltaTime);

  switch (true) {
    case syncState.state === 'idle' && properties.rate > 0 && deltaTimeAbs <= OUTER_TARGET_SYNC_THRESHOLD_MS:
      // We are on course:
      //   - The video is within accepted latency of the server time
      //   - The playback rate is aligned with the server rate
      if (mediaElement.playbackRate !== properties.rate) {
        mediaElement.playbackRate = properties.rate;
      }
      return { state: 'idle' };

    case syncState.state === 'idle' &&
      properties.rate > 0 &&
      disablePlaybackRateAdjustment === true &&
      deltaTimeAbs <= OUTER_TARGET_SYNC_NO_PLAYBACK_RATE_ADJUSTMENT_THRESHOLD_MS:
      // If we aren't able to adjust playback rate, we are more forgiving
      // in our "synced" check to avoid the clip being seeked forward
      // in normal playback where we expect to be a little out of sync
      // due to network and startup latency
      if (mediaElement.playbackRate !== properties.rate) {
        mediaElement.playbackRate = properties.rate;
      }
      return { state: 'idle' };

    case syncState.state === 'idle' &&
      disablePlaybackRateAdjustment !== true && // Never adjust playback rate if disabled for this clip
      properties.rate > 0 &&
      deltaTimeAbs > OUTER_TARGET_SYNC_THRESHOLD_MS &&
      deltaTimeAbs <= MAX_SYNC_THRESHOLD_MS: {
      // We are close, we can smoothly adjust with playbackRate:
      //  - The video must be playing
      //  - We must be close in time to the server time
      const playbackRateAdjustment = playbackSmoothing(deltaTime);
      const adjustedPlaybackRate = Math.max(0, properties.rate - playbackRateAdjustment);
      if (mediaElement.playbackRate !== adjustedPlaybackRate) {
        mediaElement.playbackRate = adjustedPlaybackRate;
      }

      return { state: 'intercepting' };
    }

    case syncState.state === 'intercepting' && properties.rate > 0 && deltaTimeAbs <= INNER_TARGET_SYNC_THRESHOLD_MS: {
      // We have intercepted, we can now play normally
      if (mediaElement.playbackRate !== properties.rate) {
        mediaElement.playbackRate = properties.rate;
      }
      return { state: 'idle' };
    }

    case syncState.state === 'intercepting' && Math.sign(deltaTime) === Math.sign(mediaElement.playbackRate - properties.rate): {
      // We have missed our interception.  Go back to idle to try again.
      return { state: 'idle' };
    }

    case syncState.state === 'intercepting':
      return { state: 'intercepting' };

    case syncState.state === 'seeking': {
      return { state: 'seeking' };
    }

    default: {
      // We cannot smoothly recover:
      //  - We seek just ahead of server time
      if (mediaElement.playbackRate !== properties.rate) {
        mediaElement.playbackRate = properties.rate;
      }
      mediaElement.currentTime = (properties.t + properties.rate * SEEK_LOOKAHEAD_MS) / 1000;
      return { state: 'seeking' };
    }
  }
}

export class ImageManager extends MediaClipManager<ImageState> {
  private imageElement: HTMLImageElement | undefined;
  protected update(): void {
    const currentState = getStateAtTime(this._state, Date.now());

    if (currentState) {
      this.imageElement = assertElement(
        this.imageElement,
        this.clipElement,
        this._state,
        this.constructAssetURL,
        this.mediaPreloader,
      ) as HTMLImageElement;
    } else if (this.imageElement) {
      this.destroy();
    }

    if (!currentState || !this.imageElement) return;

    assertVisualProperties(this.imageElement, currentState as VisualProperties, this._state.fit);
  }
  public destroy(): void {
    if (this.imageElement) {
      this.imageElement.remove();
      this.imageElement.src = '';
      this.imageElement = undefined;
    }
  }
}

export class AudioManager extends MediaClipManager<AudioState> {
  private syncState: TemporalSyncState = { state: 'idle' };
  private audioElement: HTMLAudioElement | undefined;
  public volume = 1;

  protected update(): void {
    const currentState = getStateAtTime(this._state, Date.now());
    if (currentState) {
      this.audioElement = assertElement(
        this.audioElement,
        this.clipElement,
        this._state,
        this.constructAssetURL,
        this.mediaPreloader,
      ) as HTMLAudioElement;
    } else {
      this.destroy();
    }

    if (!currentState || !this.audioElement) return;

    const sinkId = this.getAudioOutput(this._state.audioOutput);
    assertAudialProperties(this.audioElement, currentState as AudialProperties, sinkId, this.volume);
    const nextSyncState = assertTemporalProperties(
      this.audioElement,
      currentState as TemporalProperties,
      this._state.keyframes,
      this.syncState,
      this._state.disablePlaybackRateAdjustment,
    );
    if (this.syncState.state !== 'seeking' && nextSyncState.state === 'seeking') {
      this.audioElement.addEventListener(
        'seeked',
        () => {
          this.syncState = { state: 'idle' };
        },
        { passive: true, once: true },
      );
    }

    this.syncState = nextSyncState;
  }

  public destroy(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.remove();
      this.audioElement.volume = 0;
      this.audioElement.currentTime = 0;
      this.mediaPreloader.releaseElement(this.audioElement);
    }
    this.audioElement = undefined;
  }
}

export class VideoManager extends MediaClipManager<VideoState> {
  private syncState: TemporalSyncState = { state: 'idle' };
  private videoElement?: HTMLVideoElement;
  public volume = 1;

  protected update(): void {
    const currentState = getStateAtTime(this._state, Date.now());
    if (currentState) {
      this.videoElement = assertElement(
        this.videoElement,
        this.clipElement,
        this._state,
        this.constructAssetURL,
        this.mediaPreloader,
      ) as HTMLVideoElement;
    } else {
      this.destroy();
    }

    if (!currentState || !this.videoElement) return;

    const sinkId = this.getAudioOutput(this._state.audioOutput);
    assertVisualProperties(this.videoElement, currentState as VisualProperties, this._state.fit);
    assertAudialProperties(this.videoElement, currentState as AudialProperties, sinkId, this.volume);
    const nextSyncState = assertTemporalProperties(
      this.videoElement,
      currentState as TemporalProperties,
      this._state.keyframes,
      this.syncState,
      this._state.disablePlaybackRateAdjustment,
    );
    if (this.syncState.state !== 'seeking' && nextSyncState.state === 'seeking') {
      this.videoElement.addEventListener(
        'seeked',
        () => {
          this.syncState = { state: 'idle' };
        },
        { passive: true, once: true },
      );
    }

    this.syncState = nextSyncState;
  }

  public destroy(): void {
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.remove();
      this.videoElement.volume = 0;
      this.videoElement.currentTime = 0;
      this.mediaPreloader.releaseElement(this.videoElement);
    }
    this.videoElement = undefined;
  }
}
