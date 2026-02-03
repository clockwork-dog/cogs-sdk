import { CogsConnection, CogsMessageEvent, MediaSchema } from '@clockworkdog/cogs-client';
import React, { useEffect, useRef, useState } from 'react';
import { SurfaceManager } from '../../../javascript/src';

export interface MediaSurfaceProps {
  cogsConnection: CogsConnection<any, any>;
}
export function MediaSurface({ cogsConnection }: MediaSurfaceProps) {
  const surfaceManagerRef = useRef<SurfaceManager>(null);
  const surfaceStateRef = useRef<MediaSchema.MediaSurfaceState>(null);
  const [surfaceElem, setSurfaceElem] = useState<HTMLDivElement | null>();

  // Create and attach new surface manager
  useEffect(() => {
    const sm = new SurfaceManager();
    surfaceManagerRef.current = sm;
    surfaceElem?.replaceChildren(sm.element);
    return () => {
      surfaceManagerRef.current?.setState({});
      surfaceManagerRef.current = null;
      surfaceElem?.replaceChildren(/* empty */);
    };
  }, [surfaceElem]);

  // Listen to messages
  useEffect(() => {
    function updateSurfaceState({ message }: CogsMessageEvent) {
      if (message.type !== 'media_state') return;
      if (!surfaceManagerRef.current) return;
      surfaceStateRef.current = message.state;
      surfaceManagerRef.current.setState(message.state);
    }

    cogsConnection.addEventListener('message', updateSurfaceState);
    return () => cogsConnection.removeEventListener('message', updateSurfaceState);
  }, [cogsConnection]);

  return <div className="media-surface" ref={setSurfaceElem}></div>;
}
