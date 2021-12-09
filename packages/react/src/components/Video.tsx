import { assetUrl, CogsClientMessage, CogsConnection, MediaObjectFit } from '@clockworkdog/cogs-client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import useCogsMessage from '../hooks/useCogsMessage';
import VideoClipState from '../types/VideoClipState';

export interface VideoClip {
  src: string;
  state: VideoClipState;
  volume: number;
  loop: boolean;
  fit: MediaObjectFit;
}

export default function Video({
  className,
  style,
  connection,
  fullscreen,
  onStopped,
  getCachedAsset
}: {
  className?: string;
  style?: React.CSSProperties;
  connection: CogsConnection;
  fullscreen?: boolean | { style: React.CSSProperties };
  onStopped?: () => void;
  getCachedAsset?: (assetUrl: string) => string | undefined
}): JSX.Element | null {
  const [globalVolume, setGlobalVolume] = useState(1);

  const [videoClip, setVideoClip] = useState<VideoClip | null>(null);

  useCogsMessage(
    connection,
    useCallback((message: CogsClientMessage) => {
      switch (message.type) {
        case 'media_config_update':
          setGlobalVolume(message.globalVolume);
          break;
        case 'video_play':
          setVideoClip({
            src: assetUrl(message.file),
            volume: message.volume,
            fit: message.fit,
            loop: message.loop ?? false,
            state: VideoClipState.Playing,
          });
          break;
        case 'video_pause':
          setVideoClip((video) => (video ? { ...video, state: VideoClipState.Paused } : null));
          break;
        case 'video_stop':
          setVideoClip(null);
          break;
        case 'video_set_volume':
          setVideoClip((video) => (video ? { ...video, volume: message.volume } : null));
          break;
      }
    }, [])
  );

  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current) {
      switch (videoClip?.state) {
        case VideoClipState.Playing:
          ref.current.play();
          break;
        case VideoClipState.Paused:
          ref.current.pause();
          break;
        case VideoClipState.Stopped:
          ref.current.currentTime = 0;
          break;
      }
    }
  }, [videoClip]);

  useEffect(() => {
    if (ref.current) {
      ref.current.volume = videoClip?.volume ?? 1 * globalVolume;
    }
  }, [videoClip, globalVolume]);

  useEffect(() => {
    if (ref.current) {
      ref.current.loop = videoClip?.loop ?? false;
    }
  }, [videoClip]);

  const notifyVideoStopped = useCallback(() => {
    if (!videoClip?.loop) {
      setVideoClip(null);
      onStopped?.();
    }
  }, [videoClip, onStopped]);

  if (!videoClip) {
    return null;
  }

  const video = (
    <video
      className={className}
      ref={ref}
      style={{
        objectFit: videoClip.fit,
        ...(fullscreen ? { width: '100%', height: '100%' } : {}),
        ...style,
      }}
      src={(getCachedAsset && getCachedAsset(videoClip.src)) ?? videoClip.src}
      onEnded={notifyVideoStopped}
    />
  );

  const fullscreenCustomStyle = typeof fullscreen === 'object' ? fullscreen.style : undefined;
  return fullscreen ? (
    <div style={{ position: 'absolute', zIndex: 1, top: 0, left: 0, width: '100vw', height: '100vh', ...fullscreenCustomStyle }}>{video}</div>
  ) : (
    video
  );
}
