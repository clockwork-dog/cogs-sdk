import { AudioState, defaultAudioOptions } from '../types/MediaSchema';
import { getStateAtTime } from '../utils/getStateAtTime';
import { ClipManager } from './ClipManager';

const DEFAULT_AUDIO_POLLING = 1_000;
const TARGET_SYNC_THRESHOLD_MS = 10; // If we're closer than this we're good enough
const MAX_SYNC_THRESHOLD_MS = 1_000; // If we're further away than this, we'll seek instead
const SEEK_LOOKAHEAD_MS = 200; // We won't seek ahead instantly, so lets seek ahead
const MAX_PLAYBACK_RATE_ADJUSTMENT = 0.2;
// We smoothly ramp playbackRate up and down
const PLAYBACK_ADJUSTMENT_SMOOTHING = 0.5;
function playbackSmoothing(deltaTime: number) {
  return Math.sign(deltaTime) * Math.pow(Math.abs(deltaTime) / MAX_SYNC_THRESHOLD_MS, PLAYBACK_ADJUSTMENT_SMOOTHING) * MAX_PLAYBACK_RATE_ADJUSTMENT;
}

export class AudioManager extends ClipManager<AudioState> {
  private audioElement?: HTMLAudioElement;
  private isSeeking = false;

  constructor(surfaceElement: HTMLElement, clipElement: HTMLElement, state: AudioState) {
    super(surfaceElement, clipElement, state);
    this.clipElement = clipElement;
  }

  private updateAudioElement() {
    this.destroy();
    this.audioElement = document.createElement('audio');
    this.clipElement.replaceChildren(this.audioElement);
  }

  /**
   * Helper function to seek to a specified time.
   * Works with the update loop to poll until seeked event has fired.
   */
  private seekTo(time: number) {
    if (!this.audioElement) return;
    this.audioElement.addEventListener(
      'seeked',
      () => {
        this.isSeeking = false;
      },
      { once: true, passive: true },
    );
    this.audioElement.currentTime = time / 1_000;
  }

  protected update(): void {
    // Update loop used to poll until seek finished
    if (this.isSeeking) return;
    this.delay = DEFAULT_AUDIO_POLLING;

    // Does the <audio /> element need adding/removing?
    const currentState = getStateAtTime(this._state, Date.now());
    if (currentState) {
      if (!this.audioElement || !this.isConnected(this.audioElement)) {
        this.updateAudioElement();
      }
    } else {
      this.destroy();
    }

    if (!currentState || !this.audioElement) return;
    const { t, rate, volume } = { ...defaultAudioOptions, ...currentState };

    // this.audioElement.src will be a fully qualified URL
    if (!this.audioElement.src.endsWith(this._state.file)) {
      this.audioElement.src = this._state.file;
    }
    if (this.audioElement.volume !== volume) {
      this.audioElement.volume = volume;
    }

    // Should the element be playing?
    if (this.audioElement.paused && rate > 0) {
      this.audioElement.play().catch(() => {
        // Do nothing - this will be retried in the next loop
      });
    }

    const currentTime = this.audioElement.currentTime * 1000;
    const deltaTime = currentTime - t;
    const deltaTimeAbs = Math.abs(deltaTime);
    this.delay = 100;
    switch (true) {
      case deltaTimeAbs <= TARGET_SYNC_THRESHOLD_MS:
        // We are on course:
        //   - The audio is within accepted latency of the server time
        //   - The playback rate is aligned with the server rate
        if (this.audioElement.playbackRate !== rate) {
          this.audioElement.playbackRate = rate;
        }
        break;
      case rate > 0 && deltaTimeAbs > TARGET_SYNC_THRESHOLD_MS && deltaTimeAbs <= MAX_SYNC_THRESHOLD_MS: {
        // We are close, we can smoothly adjust with playbackRate:
        //  - The audio must be playing
        //  - We must be close in time to the server time
        const playbackRateAdjustment = playbackSmoothing(deltaTime);
        const adjustedPlaybackRate = Math.max(0, rate - playbackRateAdjustment);
        if (this.audioElement.playbackRate !== adjustedPlaybackRate) {
          this.audioElement.playbackRate = adjustedPlaybackRate;
        }
        break;
      }
      default: {
        // We cannot smoothly recover:
        //  - We seek just ahead of server time
        if (this.audioElement.playbackRate !== rate) {
          this.audioElement.playbackRate = rate;
        }

        // delay to poll until seeked
        this.delay = 10;
        this.seekTo(t + rate * (SEEK_LOOKAHEAD_MS / 1000));
        break;
      }
    }
  }

  destroy(): void {
    if (this.audioElement) {
      this.audioElement.src = '';
      this.audioElement.remove();
    }
  }
}
