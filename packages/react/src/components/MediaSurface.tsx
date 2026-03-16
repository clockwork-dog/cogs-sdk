import { CogsConnection, CogsMessageEvent, MediaPreloader, MediaSchema, SurfaceManager } from '@clockworkdog/cogs-client';
import React, { useEffect, useRef, useState } from 'react';

export interface MediaSurfaceProps {
  cogsConnection: CogsConnection<any, any>;
}
export function MediaSurface({ cogsConnection }: MediaSurfaceProps) {
  const surfaceManagerRef = useRef<SurfaceManager | undefined>(undefined);
  const surfaceStateRef = useRef<MediaSchema.MediaSurfaceState | undefined>(undefined);
  const mediaPreloaderRef = useRef<MediaPreloader | null>(null);
  const [surfaceElem, setSurfaceElem] = useState<HTMLDivElement | null>(null);

  // Keep updated list of audio outputs
  const audioOutputs = useRef<Record<string, string>>({});
  useEffect(() => {
    async function updateAudioOutputs() {
      const audioOutputs: Record<string, string> = {};

      if (!navigator.mediaDevices) {
        // `navigator.mediaDevices` is undefined on COGS AV <= 4.5 because of secure origin permissions
        return;
      }

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
    const constructURL = (url: string) => cogsConnection.getAssetUrl(url);

    const preloader = new MediaPreloader(constructURL);
    mediaPreloaderRef.current = preloader;
    const files = cogsConnection.mediaConfig?.files;
    if (files) {
      preloader.setState(files);
    }

    const sm = new SurfaceManager(constructURL, (outputLabel: string) => audioOutputs.current[outputLabel] ?? '', {}, preloader);
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
    function handleMessages({ message }: CogsMessageEvent) {
      if (message.type === 'media_state' && message.media_strategy === 'state' && surfaceManagerRef.current) {
        surfaceStateRef.current = message.state;
        surfaceManagerRef.current.setState(message.state);
      }

      const preloader = mediaPreloaderRef.current;
      if (message.type === 'media_config_update' && preloader) {
        preloader.setState(message.files);
      }
    }

    cogsConnection.addEventListener('message', handleMessages);
    return () => cogsConnection.removeEventListener('message', handleMessages);
  }, [cogsConnection]);

  return <div className="media-surface" ref={setSurfaceElem}></div>;
}
