import { defaultVideoOptions, VideoState } from '../types/MediaSchema';
import { getStateAtTime } from '../utils/getStateAtTime';
import { ClipManager } from './ClipManager';

const DEFAULT_VIDEO_POLLING_MS = 1_000;
const TARGET_SYNC_THRESHOLD_MS = 10; // If we're closer than this we're good enough
const MAX_SYNC_THRESHOLD_MS = 1_000; // If we're further away than this, we'll seek instead
const SEEK_LOOKAHEAD_MS = 200; // We won't seek ahead instantly, so lets seek ahead
const MAX_PLAYBACK_RATE_ADJUSTMENT = 0.15; // Don't speed up or slow down the video more than this
const INTERCEPTION_EARLY_CHECK_IN = 0.7; // When on course for interception of server time, how early to check in beforehand.

// We smoothly ramp playbackRate up and down
const PLAYBACK_ADJUSTMENT_SMOOTHING = 0.3;
function playbackSmoothing(deltaTime: number) {
  return -Math.sign(deltaTime) * Math.pow(Math.abs(deltaTime) / MAX_SYNC_THRESHOLD_MS, PLAYBACK_ADJUSTMENT_SMOOTHING) * MAX_PLAYBACK_RATE_ADJUSTMENT;
}

// If we notice that at the end of the current playback, we set t=0 we should loop
const LOOPING_EPSILON_MS = 5;
function isLooping(state: VideoState, time: number, duration: number): boolean {
  const currentState = getStateAtTime(state, time);
  if (!currentState) return false;
  const { t, rate } = currentState;
  if (t === undefined || rate === undefined) return false;

  const nextTemporalKeyframe = state.keyframes.filter(([t, kf]) => t > time && (kf?.set?.t !== undefined || kf?.set?.rate !== undefined))[0];
  if (nextTemporalKeyframe?.[1]?.set?.t !== 0) return false;

  const timeRemaining = (duration - t) / rate;
  const timeUntilKeyframe = nextTemporalKeyframe[0] - time;

  return Math.abs(timeRemaining - timeUntilKeyframe) <= LOOPING_EPSILON_MS;
}

export class VideoManager extends ClipManager<VideoState> {
  private videoElement?: HTMLVideoElement;

  // We seek to another part of the video and do nothing until we get there
  private isSeeking = false;
  // We change playbackRate to intercept the server time of the video and don't change course until we intercept
  private timeToIntercept: number | undefined = undefined;

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

  private get videoDuration(): number | undefined {
    if (!this.videoElement) return undefined;
    if (this.videoElement.readyState < HTMLMediaElement.HAVE_METADATA) return undefined;
    return this.videoElement.duration * 1000;
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
        console.debug('seeked');
        this.isSeeking = false;
      },
      { once: true, passive: true },
    );
    this.videoElement.currentTime = time / 1_000;
  }

  protected update(): void {
    // Update loop used to poll until seek finished
    if (this.isSeeking) return;

    // Does the <video /> element need adding/removing?
    const now = Date.now();
    const currentState = getStateAtTime(this._state, now);
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

    const duration = this.videoDuration;
    if (duration !== undefined) {
      // Is the video looping?
      if (isLooping(this._state, now, duration)) {
        if (!this.videoElement.loop) {
          console.debug('starting loop');
          this.videoElement.loop = true;
        }
      } else {
        if (this.videoElement.loop) {
          console.debug('stopping loop');
          this.videoElement.loop = false;
        }
        // Has the video finished
        if (t > duration) {
          console.debug('ended');
          this.delay = Infinity;
          return;
        }
      }
    }

    // Should the video be playing
    if (this.videoElement.paused && rate > 0) {
      if (duration === undefined || duration > t) {
        this.videoElement.play().catch(() => {
          // Do nothing - this will be retried in the next loop
        });
      }
    }

    const currentTime = this.videoElement.currentTime * 1000;
    const deltaTime = currentTime - t;
    const deltaTimeAbs = Math.abs(deltaTime);

    // Handle current playbackRateAdjustment
    if (this.timeToIntercept !== undefined) {
      if (deltaTimeAbs <= TARGET_SYNC_THRESHOLD_MS) {
        // We've successfully got back on track
        console.log('intercepted', `${deltaTime.toFixed(0)}ms`);
        this.timeToIntercept = undefined;
      } else {
        const newTimeToIntercept = deltaTime / (rate - this.videoElement.playbackRate);
        if (newTimeToIntercept < this.timeToIntercept && newTimeToIntercept > 0) {
          // We're getting there, let's stay on course
          console.debug(`intercepting ${newTimeToIntercept.toFixed(0)}ms`, `${deltaTime.toFixed(0)}ms`);
          this.timeToIntercept = newTimeToIntercept;
        } else {
          // We've gone too far
          console.debug('missed intercept', deltaTime, this.timeToIntercept, newTimeToIntercept);
          this.timeToIntercept = undefined;
        }
      }
    }

    switch (true) {
      case deltaTimeAbs <= TARGET_SYNC_THRESHOLD_MS: {
        // We are on course:
        //   - The video is within accepted latency of the server time
        //   - The playback rate is aligned with the server rate
        console.debug(`${rate}x`, deltaTime.toFixed(0));
        this.timeToIntercept = undefined;
        if (this.videoElement.playbackRate !== rate) {
          this.videoElement.playbackRate = rate;
        }
        this.delay = DEFAULT_VIDEO_POLLING_MS;
        break;
      }

      case this.timeToIntercept !== undefined:
        // We are currently on course to intercept
        //   - We don't want to adjust the playbackRate excessively to pop audio
        //   - We are on track to get back on time.  So we can wait.
        this.delay = this.timeToIntercept * INTERCEPTION_EARLY_CHECK_IN;
        break;

      case rate > 0 && deltaTimeAbs > TARGET_SYNC_THRESHOLD_MS && deltaTimeAbs <= MAX_SYNC_THRESHOLD_MS && this.timeToIntercept === undefined: {
        // We are close, we can smoothly adjust with playbackRate:
        //  - The video must be playing
        //  - We must be close in time to the server time
        const playbackRateAdjustment = playbackSmoothing(deltaTime);
        const adjustedPlaybackRate = Math.max(0, rate + playbackRateAdjustment);
        this.timeToIntercept = deltaTime / (rate - adjustedPlaybackRate);

        console.debug(`${adjustedPlaybackRate.toFixed(2)}x`, `${deltaTime.toFixed(0)}ms`);
        if (this.videoElement.playbackRate !== adjustedPlaybackRate) {
          this.videoElement.playbackRate = adjustedPlaybackRate;
        }
        this.delay = this.timeToIntercept * INTERCEPTION_EARLY_CHECK_IN;
        break;
      }

      default: {
        // We cannot smoothly recover:
        //  - We seek just ahead of server time
        if (this.videoElement.playbackRate !== rate) {
          this.videoElement.playbackRate = rate;
        }

        // delay to poll until seeked
        console.debug('seeking');
        this.delay = 10;
        this.seekTo(t + rate * SEEK_LOOKAHEAD_MS);
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
