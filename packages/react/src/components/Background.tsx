import { CogsConnection } from '@clockworkdog/cogs-client';
import React from 'react';
import useBackground from '../hooks/useBackground';

export default function Background({
  className,
  style,
  connection,
}: {
  className?: string;
  style?: React.CSSProperties;
  connection: CogsConnection;
}): JSX.Element {
  const background = useBackground(connection);

  return (
    <div
      {...{ className }}
      style={{
        zIndex: -1,
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: background?.color || 'transparent',
        backgroundImage: background?.image?.file ? `url("${background.image.file}")` : 'none',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: background?.image?.fit ?? 'auto',
        ...style,
      }}
    />
  );
}
