// We need to require this rather than importing it to ensure Webpack picks the correct version of the library.
// We also then need to import the same class as a type so we can return the correct Typescript types.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
/// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Html5VideoPipeline, isRtcpBye } = require('media-stream-library/dist/browser-cjs.js');
import type { Html5VideoPipeline as THtml5VideoPipeline, Rtcp } from 'media-stream-library';
import { COGS_SERVER_PORT } from './helpers/urls';

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
  public play(params: { uri: string; videoElement: HTMLVideoElement }): THtml5VideoPipeline {
    const { uri, videoElement } = params;

    const pipeline = new Html5VideoPipeline({
      ws: { uri: this._websocketUri },
      rtsp: { uri: uri },
      mediaElement: videoElement,
    });

    // Restart stream on RTCP BYE (stream ended)
    pipeline.rtsp.onRtcp = (rtcp: Rtcp) => {
      if (isRtcpBye(rtcp)) {
        setTimeout(() => this.play(params), 0);
      }
    };

    // Start playback when ready
    pipeline.ready.then(() => {
      pipeline.rtsp.play();
    });

    return pipeline;
  }
}
