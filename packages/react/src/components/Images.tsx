import { assetUrl, CogsConnection } from '@clockworkdog/cogs-client';
import React from 'react';
import useImages from '../hooks/useImages';
import { useCogsConnection } from '../providers/CogsConnectionProvider';

export default function Images({
  className,
  style,
  connection: customConnection,
  fullscreen,
}: {
  className?: string;
  style?: React.CSSProperties;
  connection: CogsConnection;
  fullscreen?: boolean | { style: React.CSSProperties };
}): JSX.Element | null {
  const providerConnection = useCogsConnection();
  const connection = customConnection ?? providerConnection;

  const images = useImages(connection);

  const fullscreenCustomStyle = typeof fullscreen === 'object' ? fullscreen.style : undefined;

  const imageElements = images.map((image, index) => (
    <img
      className={className}
      key={index}
      src={assetUrl(image.file)}
      alt={image.file}
      style={{
        objectFit: image.fit,
        ...(fullscreen ? { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 } : {}),
        ...style,
      }}
    />
  ));

  return (
    <>
      {fullscreen ? (
        <div style={{ position: 'absolute', zIndex: 2, top: 0, left: 0, width: '100vw', height: '100vh', ...fullscreenCustomStyle }}>
          {imageElements}
        </div>
      ) : (
        imageElements
      )}
    </>
  );
}
