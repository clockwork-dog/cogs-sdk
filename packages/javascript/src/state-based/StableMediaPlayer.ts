import { ClipManager } from './ClipManager';
import { AudioState, MediaClipState, VideoState } from '../types/MediaSchema';

const CHECK_MEDIA_POLL_MS = 1_000;
const TARGET_SYNC_THRESHOLD_MS = 10; // If we're closer than this we're good enough
const MAX_SYNC_THRESHOLD_MS = 1_000; // If we're further away than this, we'll seek instead
const MAX_PLAYBACK_RATE_ADJUSTMENT = 0.2;

export class StableMediaPlayer extends ClipManager {
  protected destroy(): void {
    this._abort = true;
  }
  private _abort = false;
  private _state: MediaClipState;
  private _element: HTMLMediaElement;
  private defaultPlaybackRate = 1;

  constructor(state: AudioState | VideoState) {
    super();
    this._state = state;
    this._element = document.createElement(state.type);
    this.stabilize();
  }

  public set state(newValue: MediaClipState) {
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
    this._element.src = this._state.file;
    this._element.volume = this._state.volume;
    this._element.loop = this._state.loop;

    while (!this._abort) {
      const { startTime, endTime, volume, loop } = this._state;
      const now = Date.now();

      // Has volume changed?
      if (this._element.volume !== volume) {
        console.warn(`Media ${this._state.id} has changed volume`);
        this._element.volume = volume;
      }

      // Does the media loop?
      if (this._element.loop !== loop) {
        console.warn(`Media ${this._state.id} has changed loop`);
        this._element.loop = loop;
      }

      // Should the media be playing?
      if (now >= startTime && this._element.paused) {
        this._element.play().catch(console.warn);
      }

      // Is the media queued?
      if (now < startTime) {
        this._element.pause();
        continue;
      }

      const targetTime = now - startTime;
      const currentTime = this._element.currentTime * 1000;
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

      await new Promise((res) => setTimeout(res, CHECK_MEDIA_POLL_MS));
    }
  }
}
