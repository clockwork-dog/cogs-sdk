import { CogsConnection, CogsMessageEvent, MediaSchema, SurfaceManager } from '@clockworkdog/cogs-client';
import React, { useEffect, useRef, useState } from 'react';

export interface MediaSurfaceProps {
  cogsConnection: CogsConnection<any, any>;
}
export function MediaSurface({ cogsConnection }: MediaSurfaceProps) {
  const surfaceManagerRef = useRef<SurfaceManager | undefined>(undefined);
  const surfaceStateRef = useRef<MediaSchema.MediaSurfaceState | undefined>(undefined);
  const [surfaceElem, setSurfaceElem] = useState<HTMLDivElement | null>(null);

  // Keep updated list of audio outputs
  const audioOutputs = useRef<Record<string, string>>({});
  useEffect(() => {
    async function updateAudioOutputs() {
      const audioOutputs: Record<string, string> = {};
      const devices = await navigator.mediaDevices.enumerateDevices();
      const outputs = devices.filter((device) => device.kind === 'audiooutput');
      outputs.forEach((output) => {
        audioOutputs[output.label] = output.deviceId;
      });
    }

    updateAudioOutputs();
    navigator.mediaDevices.addEventListener('devicechange', updateAudioOutputs);
    return () => navigator.mediaDevices.removeEventListener('devicechange', updateAudioOutputs);
  }, []);

  // Create and attach new surface manager
  useEffect(() => {
    const sm = new SurfaceManager(
      (url: string) => cogsConnection.getAssetUrl(url),
      (outputLabel: string) => audioOutputs.current[outputLabel],
    );
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
