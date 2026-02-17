import { CogsConnection, CogsMessageEvent, MediaPreloader, MediaSchema, SurfaceManager } from '@clockworkdog/cogs-client';
import React, { useEffect, useRef, useState } from 'react';

export interface MediaSurfaceProps {
  cogsConnection: CogsConnection<any, any>;
}
export function MediaSurface({ cogsConnection }: MediaSurfaceProps) {
  const surfaceManagerRef = useRef<SurfaceManager>(undefined);
  const surfaceStateRef = useRef<MediaSchema.MediaSurfaceState>(undefined);
  const [surfaceElem, setSurfaceElem] = useState<HTMLDivElement | null>();

  // Create and attach new surface manager
  useEffect(() => {
    const mediaPreloader = new MediaPreloader(cogsConnection.getAssetUrl);
    const sm = new SurfaceManager(cogsConnection.getAssetUrl, {}, mediaPreloader);

    cogsConnection.addEventListener('message', ({ message }) => {
      if (message.type === 'media_config_update') {
        mediaPreloader.setState(message.files);
      }
    });

    surfaceManagerRef.current = sm;
    surfaceElem?.replaceChildren(sm.element);
    return () => {
      surfaceManagerRef.current?.setState({});
      surfaceManagerRef.current = undefined;
      surfaceElem?.replaceChildren(/* empty */);
    };
  }, [surfaceElem, cogsConnection.getAssetUrl]);

  // Listen to messages
  useEffect(() => {
    function updateSurfaceState({ message }: CogsMessageEvent) {
      if (message.type === 'media_state' && message.media_strategy === 'state' && surfaceManagerRef.current) {
        surfaceStateRef.current = message.state;
        surfaceManagerRef.current.setState(message.state);
      }
    }

    cogsConnection.addEventListener('message', updateSurfaceState);
    return () => cogsConnection.removeEventListener('message', updateSurfaceState);
  }, [cogsConnection]);

  return <div className="media-surface" ref={setSurfaceElem}></div>;
}
