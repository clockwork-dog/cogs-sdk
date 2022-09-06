import { Html5VideoPipeline, isRtcpBye } from '@clockworkdog/media-stream-library-browser';
import { COGS_SERVER_PORT } from './helpers/urls';

// Use a faster-than-realtime playback rate by default
// so that it keeps up with a realtime stream in case of video buffering
const DEFAULT_VIDEO_PLAYBACK_RATE = 1.1;

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
   * @returns The playing HTML5 video pipeline.
   */
  public play(params: { uri: string; videoElement: HTMLVideoElement; playbackRate?: number }): Html5VideoPipeline {
    const { uri, videoElement } = params;

    const pipeline = new Html5VideoPipeline({
      ws: { uri: this._websocketUri },
      rtsp: { uri: uri },
      mediaElement: videoElement,
    });

    // Restart stream on RTCP BYE (stream ended)
    pipeline.rtsp.onRtcp = (rtcp) => {
      if (isRtcpBye(rtcp)) {
        setTimeout(() => this.play(params), 0);
      }
    };

    // Start playback when ready
    pipeline.ready.then(() => {
      pipeline.rtsp.play();
    });

    videoElement.playbackRate = params.playbackRate ?? DEFAULT_VIDEO_PLAYBACK_RATE;
    videoElement.addEventListener('play', () => {
      videoElement.playbackRate = params.playbackRate ?? DEFAULT_VIDEO_PLAYBACK_RATE;
    });

    return pipeline;
  }
}
