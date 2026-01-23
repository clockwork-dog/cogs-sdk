import { defaultVideoOptions, VideoState } from '../types/MediaSchema';
import { getStateAtTime } from '../utils/getStateAtTime';
import { ClipManager } from './ClipManager';

const DEFAULT_VIDEO_POLLING = 1_000;
const TARGET_SYNC_THRESHOLD_MS = 10; // If we're closer than this we're good enough
const MAX_SYNC_THRESHOLD_MS = 1_000; // If we're further away than this, we'll seek instead
const SEEK_LOOKAHEAD_MS = 200; // We won't seek ahead instantly, so lets seek ahead
const MAX_PLAYBACK_RATE_ADJUSTMENT = 0.5;
// We smoothly ramp playbackRate up and down
const PLAYBACK_ADJUSTMENT_SMOOTHING = 0.3;
function playbackSmoothing(deltaTime: number) {
  return Math.sign(deltaTime) * Math.pow(Math.abs(deltaTime) / MAX_SYNC_THRESHOLD_MS, PLAYBACK_ADJUSTMENT_SMOOTHING) * MAX_PLAYBACK_RATE_ADJUSTMENT;
}

export class VideoManager extends ClipManager<VideoState> {
  private videoElement?: HTMLVideoElement;
  private isSeeking = false;

  constructor(surfaceElement: HTMLElement, clipElement: HTMLElement, state: VideoState) {
    super(surfaceElement, clipElement, state);
    this.clipElement = clipElement;
  }

  private updateVideoElement() {
    this.destroy();
    this.videoElement = document.createElement('video');
    this.clipElement.replaceChildren(this.videoElement);
    this.videoElement.style.position = 'absolute';
    this.videoElement.style.width = '100%';
    this.videoElement.style.height = '100%';
  }

  /**
   * Helper function to seek to a specified time.
   * Works with the update loop to poll until seeked event has fired.
   */
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
    this.delay = DEFAULT_VIDEO_POLLING;

    // Does the <video /> element need adding/removing?
    const currentState = getStateAtTime(this._state, Date.now());
    if (currentState) {
      if (!this.videoElement || !this.isConnected(this.videoElement)) {
        this.updateVideoElement();
      }
    } else {
      this.videoElement?.remove();
      this.videoElement = undefined;
    }

    if (!currentState || !this.videoElement) return;
    const { t, rate, volume } = { ...defaultVideoOptions, ...currentState };

    // this.videoElement.src will be a fully qualified URL
    if (!this.videoElement.src.endsWith(this._state.file)) {
      this.videoElement.src = this._state.file;
    }
    if (this.videoElement.style.objectFit !== this._state.fit) {
      this.videoElement.style.objectFit = this._state.fit;
    }
    if (parseFloat(this.videoElement.style.opacity) !== currentState.opacity) {
      this.videoElement.style.opacity = String(currentState.opacity ?? defaultVideoOptions.opacity);
    }
    const z = Math.round(currentState.zIndex ?? defaultVideoOptions.zIndex);
    if (parseInt(this.videoElement.style.zIndex) !== z) {
      this.videoElement.style.zIndex = String(z);
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
    this.delay = 100;
    switch (true) {
      case deltaTimeAbs <= TARGET_SYNC_THRESHOLD_MS:
        // We are on course:
        //   - The video is within accepted latency of the server time
        //   - The playback rate is aligned with the server rate
        if (this.videoElement.playbackRate !== rate) {
          this.videoElement.playbackRate = rate;
        }
        break;
      case rate > 0 && deltaTimeAbs > TARGET_SYNC_THRESHOLD_MS && deltaTimeAbs <= MAX_SYNC_THRESHOLD_MS: {
        // We are close, we can smoothly adjust with playbackRate:
        //  - The video must be playing
        //  - We must be close in time to the server time
        const playbackRateAdjustment = playbackSmoothing(deltaTime);
        const adjustedPlaybackRate = Math.max(0, rate - playbackRateAdjustment);
        if (this.videoElement.playbackRate !== adjustedPlaybackRate) {
          this.videoElement.playbackRate = adjustedPlaybackRate;
        }
        break;
      }
      default: {
        // We cannot smoothly recover:
        //  - We seek just ahead of server time
        if (this.videoElement.playbackRate !== rate) {
          this.videoElement.playbackRate = rate;
        }

        // delay to poll until seeked
        this.delay = 10;
        this.seekTo(t + rate * (SEEK_LOOKAHEAD_MS / 1000));
        break;
      }
    }
  }

  destroy(): void {
    if (this.videoElement) {
      this.videoElement.src = '';
      this.videoElement.remove();
    }
  }
}
