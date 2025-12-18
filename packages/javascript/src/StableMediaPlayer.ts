import { MediaState } from './MediaManager';

// Common media extensions
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/MIME_types/Common_types
const SUPPORTED_IMAGE_EXTENSIONS = new Set(['apng', 'avif', 'bmp', 'gif', 'ico', 'jpeg', 'jpg', 'png', 'svg', 'tif', 'tiff', 'webp']);
const SUPPORTED_AUDIO_EXTENSIONS = new Set(['aac', 'mp3']);
const SUPPORTED_VIDEO_EXTENSIONS = new Set(['avi', 'mp4', 'mpeg', 'mov', 'ogv']);

export const getMediaTagName = (filename: string): 'audio' | 'img' | 'video' => {
  const extension = filename.split('.').pop();
  if (extension === undefined) {
    throw new Error(`Unknown extension of ${filename}`);
  }
  if (SUPPORTED_VIDEO_EXTENSIONS.has(extension)) {
    return 'video';
  }
  if (SUPPORTED_AUDIO_EXTENSIONS.has(extension)) {
    return 'audio';
  }
  if (SUPPORTED_IMAGE_EXTENSIONS.has(extension)) {
    return 'img';
  }
  throw new Error(`Unknown extension: ${extension}`);
};

const CHECK_MEDIA_POLL_MS = 1_000;
const TARGET_SYNC_THRESHOLD_MS = 10; // If we're closer than this we're good enough
const MAX_SYNC_THRESHOLD_MS = 1_000; // If we're further away than this, we'll seek instead
const MAX_PLAYBACK_RATE_ADJUSTMENT = 0.2;

export class StableMediaPlayer {
  private _abort = new AbortController();
  private _state: MediaState;
  private _element: HTMLMediaElement;
  private defaultPlaybackRate = 1; // TODO: Calculate from manifest, and check with video duration

  constructor(state: MediaState) {
    const tagName = getMediaTagName(state.url);
    if (tagName === 'img') {
      throw new Error('Cannot construct StableMediaPlayer for images');
    }
    this._state = state;
    this._element = document.createElement(tagName);
    this.stabilize();
  }

  public get element() {
    return this._element;
  }
  public get abort() {
    return this._abort;
  }
  public set state(newValue: MediaState) {
    this._state = this.state;
  }

  private async seekTo(time: number) {
    const seekPromise = new Promise((res) => {
      this._element.addEventListener('seeked', res, { once: true, passive: true });
    });
    this._element.currentTime = time / 1000;
    await seekPromise;
  }

  private async stabilize() {
    this._element.src = this._state.url;
    this._element.volume = this._state.volume;
    this._element.loop = this._state.loop;

    while (!this._abort.signal.aborted) {
      const { startTime, endTime, volume, loop } = this._state;
      const now = Date.now();

      // Has volume changed?
      if (this.element.volume !== volume) {
        console.warn(`Media ${this._state.id} has changed volume`);
        this.element.volume = volume;
      }

      // Does the media loop?
      if (this.element.loop !== loop) {
        console.warn(`Media ${this._state.id} has changed loop`);
        this._element.loop = loop;
      }

      // Should the media be playing?
      if (now >= startTime && this._element.paused) {
        this._element.play().catch(console.warn);
      }

      // Has media exhausted?
      if (now > endTime && !loop) {
        this.element.remove();
        this._abort.abort();
        continue;
      }

      // Is the media queued?
      if (now < startTime) {
        this.element.pause();
        continue;
      }

      const targetTime = now - startTime;
      const currentTime = this.element.currentTime * 1000;
      const deltaTime = currentTime - targetTime;
      const deltaTimeAbs = Math.abs(deltaTime);

      // Are we at the correct time?
      switch (true) {
        case deltaTimeAbs <= TARGET_SYNC_THRESHOLD_MS:
          this._element.playbackRate = this.defaultPlaybackRate;
          break;
        case deltaTimeAbs > TARGET_SYNC_THRESHOLD_MS && deltaTimeAbs <= MAX_SYNC_THRESHOLD_MS: {
          const playbackRateAdjustment = (deltaTime / MAX_SYNC_THRESHOLD_MS) * MAX_PLAYBACK_RATE_ADJUSTMENT;
          this._element.playbackRate = this.defaultPlaybackRate - playbackRateAdjustment;
          break;
        }
        case deltaTimeAbs > MAX_SYNC_THRESHOLD_MS: {
          this.seekTo(targetTime);
          break;
        }
        default:
          this._element.playbackRate = this.defaultPlaybackRate;
          console.warn(`Unknown time error: ${deltaTime}`);
      }
      console.log(deltaTime, this._element.playbackRate);

      await new Promise((res) => setTimeout(res, CHECK_MEDIA_POLL_MS));
    }
  }
}
