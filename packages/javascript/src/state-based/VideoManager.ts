import { defaultVideoOptions, VideoState } from '../types/MediaSchema';
import { getStateAtTime } from '../utils/getStateAtTime';
import { ClipManager } from './ClipManager';

const DEFAULT_VIDEO_POLLING = 1_000;
const TARGET_SYNC_THRESHOLD_MS = 10; // If we're closer than this we're good enough
const MAX_SYNC_THRESHOLD_MS = 1_000; // If we're further away than this, we'll seek instead
const SEEK_LOOKAHEAD_MS = 200; // We won't seek ahead instantly, so lets seek ahead
const MAX_PLAYBACK_RATE_ADJUSTMENT = 0.5;

export class VideoManager extends ClipManager<VideoState> {
  private videoElement?: HTMLVideoElement;
  private isSeeking = false;

  constructor(surfaceElement: HTMLElement, clipElement: HTMLElement, state: VideoState) {
    super(surfaceElement, clipElement, state);
    this.videoElement = document.createElement('video');
    clipElement.replaceChildren(this.videoElement);
  }

  private seekTo(time: number) {
    if (!this.videoElement) return;
    this.videoElement.addEventListener(
      'seeked',
      () => {
        this.isSeeking = false;
      },
      { once: true, passive: true },
    );
    this.videoElement.currentTime = time / 1_000;
  }

  protected update(): void {
    // Update loop used to poll until seek finished
    if (this.isSeeking) return;
    if (!this.videoElement) return;
    const currentState = getStateAtTime(this._state, Date.now());
    if (!currentState) return;

    this.delay = DEFAULT_VIDEO_POLLING;
    const { t, rate, volume } = { ...defaultVideoOptions, ...currentState };

    // videoElement.src will be a fully qualified URL
    if (!this.videoElement.src.endsWith(this._state.file)) {
      this.videoElement.src = this._state.file;
    }
    if (this.videoElement.style.objectFit !== this._state.fit) {
      this.videoElement.style.objectFit = this._state.fit;
    }
    if (this.videoElement.volume !== volume) {
      this.videoElement.volume = volume;
    }

    // Should the element be playing?
    if (this.videoElement.paused && rate > 0) {
      this.videoElement.play().catch(() => {
        // Do nothing - this will be retried in the next loop
      });
    }

    const currentTime = this.videoElement.currentTime * 1000;
    const deltaTime = currentTime - t;
    const deltaTimeAbs = Math.abs(deltaTime);
    switch (true) {
      case deltaTimeAbs <= TARGET_SYNC_THRESHOLD_MS:
        if (this.videoElement.playbackRate !== rate) {
          this.videoElement.playbackRate = rate;
        }
        break;
      case deltaTimeAbs > TARGET_SYNC_THRESHOLD_MS && deltaTimeAbs <= MAX_SYNC_THRESHOLD_MS: {
        this.delay = 100;
        const playbackRateAdjustment = (deltaTime / MAX_SYNC_THRESHOLD_MS) * MAX_PLAYBACK_RATE_ADJUSTMENT;
        this.videoElement.playbackRate = rate - playbackRateAdjustment;
        break;
      }
      case deltaTimeAbs > MAX_SYNC_THRESHOLD_MS: {
        // delay to poll until seeked
        this.delay = 10;
        this.seekTo(t + rate * (SEEK_LOOKAHEAD_MS / 1000));
        break;
      }
      default:
        this.videoElement.playbackRate = rate;
        console.warn(`Unknown time error: ${deltaTime}`);
    }
  }

  destroy(): void {
    this.videoElement?.remove();
  }
}
