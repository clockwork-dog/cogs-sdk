import { assetUrl, CogsClientMessage, CogsConnection, MediaObjectFit } from '@clockworkdog/cogs-client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import useCogsMessage from '../hooks/useCogsMessage';
import useImages from '../hooks/useImages';
import VideoClipState from '../types/VideoClipState';

export interface VideoClip {
  src: string;
  state: VideoClipState;
  volume: number;
  loop: boolean;
  fit: MediaObjectFit;
}

export default function Images({
  className,
  style,
  connection,
  fullscreen,
}: {
  className?: string;
  style?: React.CSSProperties;
  connection: CogsConnection;
  fullscreen?: boolean | { style: React.CSSProperties };
}): JSX.Element | null {
  const images = useImages(connection);

  const fullscreenCustomStyle = typeof fullscreen === 'object' ? fullscreen.style : undefined;

  return (
    <>
      {images.map((image, index) => {
        const imageElement = (
          <img
            className={className}
            key={index}
            src={assetUrl(image.file)}
            alt={image.file}
            style={{
              objectFit: image.fit,
              ...(fullscreen ? { width: '100%', height: '100%' } : {}),
              ...style,
            }}
          />
        );

        return fullscreen ? (
          <div style={{ position: 'absolute', zIndex: 2, top: 0, left: 0, width: '100vw', height: '100vh', ...fullscreenCustomStyle }}>
            {imageElement}
          </div>
        ) : (
          imageElement
        );
      })}
    </>
  );
}
