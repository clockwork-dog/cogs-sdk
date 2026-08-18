import { CogsConnection, createSurfaceManager } from '@clockworkdog/cogs-client';
import React, { useEffect, useState } from 'react';

export interface MediaSurfaceProps {
  cogsConnection: CogsConnection<any, any>;
}
export function MediaSurface({ cogsConnection }: MediaSurfaceProps) {
  const [surfaceElem, setSurfaceElem] = useState<HTMLDivElement | null>(null);

  // Create and attach new surface manager
  useEffect(() => {
    const { surfaceManager, destroy } = createSurfaceManager(cogsConnection);
    surfaceElem?.replaceChildren(surfaceManager.element);
    return () => {
      destroy();
      surfaceElem?.replaceChildren(/* empty */);
    };
  }, [surfaceElem, cogsConnection.getAssetUrl]);

  return <div className="media-surface" ref={setSurfaceElem}></div>;
}
