import { CogsRtspStreamer } from '@clockworkdog/cogs-client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import usePageVisibility from '../hooks/usePageVisibility';

export interface RtspVideoProps {
  uri: string;
  websocketHostname?: string;
  websocketPort?: number;
  websocketPath?: string;
}

/**
 * Takes an RTSP video URL and streams it in a video element. By default this will open the TCP relay
 * websocket on the same hostname as COGS is running, but can be configured by passing in custom
 * websocket details.
 */
export default function RtspVideo({
  uri,
  websocketHostname,
  websocketPort,
  websocketPath,
  ...rest
}: RtspVideoProps & React.DetailedHTMLProps<React.VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement>): JSX.Element | null {
  // We need to monitor the page visibility as we only want the stream to play when the page is visible
  // This is needed because the stream will "pause" when the page looses focus and start playback when it
  // becomes visible again. This will essentially cause a delay to be introduced into the stream when loosing
  // page focus. To fix this, we simply stop and restart the stream when the page visibility changes.
  const isVisible = usePageVisibility();

  // For the video ref we actually use state so useEffect runs when the video ref changes
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);
  const videoRefCallback = useCallback((newRef: HTMLVideoElement | null) => setVideoRef(newRef), []);

  // Get the RTSP streamer from the COGS provider
  const rtspStreamer = useMemo(
    () =>
      new CogsRtspStreamer({
        hostname: websocketHostname,
        port: websocketPort,
        path: websocketPath,
      }),
    [websocketHostname, websocketPath, websocketPort]
  );

  // An effect which runs when the video element, page visibility, or URIs change
  // This will start playback of the camera stream in the given element
  useEffect(() => {
    // Nothing to do if we don't yet have a video element yet or if the page isn't visible
    if (!videoRef || !rtspStreamer || !isVisible) {
      return;
    }

    const pipeline = rtspStreamer.play({
      uri,
      videoElement: videoRef,
    });

    return () => {
      pipeline.close();
    };
  }, [uri, isVisible, rtspStreamer, videoRef]);

  return <video ref={videoRefCallback} autoPlay {...rest} />;
}
