import { Html5VideoPipeline, isRtcpBye } from '@clockworkdog/media-stream-library-browser';
import { COGS_SERVER_PORT } from './helpers/urls';

const DEFAULT_VIDEO_PLAYBACK_RATE = 1;

// Use a faster-than-realtime playback rate by default
// so that it keeps up with a realtime stream in case of video buffering
export const LIVE_VIDEO_PLAYBACK_RATE = 1.1;

/**
 * Manages a websocket connection to the COGS TCP relay which can be used to send RTSP video
 * feeds to the web.
 */
export default class RtspStreamer {
  private _websocketUri: string;

  constructor({
    hostname = document.location.hostname,
    port = COGS_SERVER_PORT,
    path = '/tcp-proxy',
  }: { hostname?: string; port?: number; path?: string } = {}) {
    this._websocketUri = `ws://${hostname}:${port}${path}`;
  }

  /**
   * Start an RTSP video stream on with the given URI on the given video element.
   * @returns An object with a function to close the pipeline
   */
  public play(params: { uri: string; videoElement: HTMLVideoElement; playbackRate?: number; restartIfStopped?: boolean }): { close: () => void } {
    const { uri, videoElement } = params;

    videoElement.playsInline = true; // Required for iOS

    let pipeline: Html5VideoPipeline;

    const startPipeline = () => {
      pipeline?.close();

      pipeline = new Html5VideoPipeline({
        ws: { uri: this._websocketUri },
        rtsp: { uri: uri },
        mediaElement: videoElement,
      });

      // Restart stream on RTCP BYE (stream ended)
      pipeline.rtsp.onRtcp = (rtcp) => {
        if (isRtcpBye(rtcp)) {
          console.log('Video stream ended. Restarting.');
          videoElement.pause();
          setTimeout(startPipeline, 0);
        }
      };

      // Start playback when ready
      pipeline.ready.then(() => {
        pipeline.rtsp.play();
      });
    };

    startPipeline();

    if (params.playbackRate) {
      const playbackRate = params.playbackRate ?? DEFAULT_VIDEO_PLAYBACK_RATE;
      videoElement.playbackRate = playbackRate;
      videoElement.addEventListener('play', () => {
        videoElement.playbackRate = playbackRate;
      });
    }

    let removeRestartListeners: (() => void) | null = null;

    if (params.restartIfStopped) {
      let playing = false;
      let interval: ReturnType<typeof setInterval> | null = null;
      const handleTimeUpdate = () => {
        playing = true;
      };
      const handlePlay = () => {
        playing = true;
        videoElement.addEventListener('timeupdate', handleTimeUpdate);
        if (!interval) {
          interval = setInterval(() => {
            if (!playing) {
              console.log('Video stopped playing. Restarting.');
              videoElement.pause();
              setTimeout(startPipeline, 0);
            }
            playing = false;
          }, 2000);
        }
      };
      const handlePause = () => {
        videoElement.removeEventListener('timeupdate', handleTimeUpdate);
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      };

      videoElement.addEventListener('play', handlePlay);
      videoElement.addEventListener('pause', handlePause);

      removeRestartListeners = () => {
        handlePause();
        videoElement.removeEventListener('play', handlePlay);
        videoElement.removeEventListener('pause', handlePause);
      };
    }

    return {
      close: () => {
        pipeline?.close();
        removeRestartListeners?.();
      },
    };
  }
}
