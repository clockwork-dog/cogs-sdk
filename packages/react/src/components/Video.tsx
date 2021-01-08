import { CogsClientMessage, MediaObjectFit } from '@clockworkdog/cogs-client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { assetSrc } from '../helpers/urls';
import ClipState from '../types/ClipState';
import CogsConnectionHandler from '../types/CogsConnectionHandler';

export interface VideoClip {
  src: string;
  state: ClipState;
  volume: number;
  loop: boolean;
  fit: MediaObjectFit;
}

export default function Video({
  className,
  style,
  connection,
  fullscreen,
}: {
  className?: string;
  style?: React.CSSProperties;
  connection: CogsConnectionHandler;
  fullscreen?: boolean;
}): JSX.Element | null {
  const [globalVolume, setGlobalVolume] = useState(1);

  const [videoClip, setVideoClip] = useState<VideoClip | null>(null);

  const onMessage = useCallback(
    (message: CogsClientMessage) => {
      switch (message.type) {
        case 'media_config_update':
          setGlobalVolume(message.globalVolume);
          break;
        case 'video_play':
          setVideoClip({
            src: assetSrc(message.file),
            volume: message.volume,
            fit: message.fit,
            loop: message.loop ?? false,
            state: ClipState.Playing,
          });
          break;
        case 'video_pause':
          setVideoClip((video) => (video ? { ...video, state: ClipState.Paused } : null));
          break;
        case 'video_stop':
          setVideoClip(null);
          break;
        case 'video_set_volume':
          setVideoClip((video) => (video ? { ...video, volume: message.volume } : null));
          break;
      }
    },
    [setVideoClip, setGlobalVolume]
  );

  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current) {
      switch (videoClip?.state) {
        case ClipState.Playing:
          ref.current.play();
          break;
        case ClipState.Paused:
          ref.current.pause();
          break;
        case ClipState.Stopped:
          ref.current.currentTime = 0;
          break;
      }
    }
  }, [ref, videoClip]);

  useEffect(() => {
    if (ref.current) {
      ref.current.volume = videoClip?.volume ?? 1 * globalVolume;
    }
  }, [ref, videoClip, globalVolume]);

  useEffect(() => {
    if (ref.current) {
      ref.current.loop = videoClip?.loop ?? false;
    }
  }, [ref, videoClip]);

  const notifyVideoEnded = useCallback(() => {
    !videoClip?.loop && setVideoClip(null);
  }, [videoClip, setVideoClip]);

  useEffect(() => {
    const handler = { onMessage };
    connection.addHandler(handler);
    return () => {
      connection.removeHandler(handler);
    };
  }, [connection, onMessage]);

  if (!videoClip) {
    return null;
  }

  const video = (
    <video
      className={className}
      ref={ref}
      style={{
        objectFit: videoClip.fit,
        ...(fullscreen ? { position: 'absolute', width: '100%', height: '100%' } : {}),
        ...style,
      }}
      src={videoClip.src}
      onEnded={notifyVideoEnded}
    />
  );

  return fullscreen ? (
    <div style={{ position: 'absolute', top: 0, left: 0 }}>
      <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>{video}</div>
    </div>
  ) : (
    video
  );
}
