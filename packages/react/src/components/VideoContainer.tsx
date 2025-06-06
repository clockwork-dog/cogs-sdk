import { CogsVideoPlayer } from '@clockworkdog/cogs-client';
import React, { ReactNode, useEffect, useRef } from 'react';
import { useVideoPlayer } from '../providers/CogsConnectionProvider';

export default function VideoContainer({
  className,
  style,
  videoPlayer: customVideoPlayer,
  fullscreen,
}: {
  className?: string;
  style?: React.CSSProperties;
  videoPlayer?: CogsVideoPlayer | null;
  fullscreen?: boolean | { style: React.CSSProperties };
}): ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoPlayer = useVideoPlayer(customVideoPlayer ?? undefined);

  useEffect(() => {
    if (videoPlayer && containerRef.current) {
      videoPlayer.setParentElement(containerRef.current);
      return () => videoPlayer.resetParentElement();
    }
  }, [videoPlayer]);

  const fullscreenCustomStyle = typeof fullscreen === 'object' ? fullscreen.style : style;
  return (
    <div
      ref={containerRef}
      className={className}
      style={
        fullscreen
          ? { position: 'absolute', zIndex: 1, top: 0, left: 0, width: '100vw', height: '100vh', ...fullscreenCustomStyle }
          : { position: 'relative', ...style }
      }
    />
  );
}
