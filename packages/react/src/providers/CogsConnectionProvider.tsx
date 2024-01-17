import { CogsAudioPlayer, CogsConnection, CogsPluginManifest, CogsVideoPlayer } from '@clockworkdog/cogs-client';
import React, { useContext, useEffect, useRef, useState } from 'react';

type CogsConnectionContextValue<Manifest extends CogsPluginManifest> = {
  useCogsConnection: () => CogsConnection<Manifest>;
  useAudioPlayer: () => CogsAudioPlayer | null;
  useVideoPlayer: () => CogsVideoPlayer | null;
};

const CogsConnectionContext = React.createContext<CogsConnectionContextValue<any>>({
  useCogsConnection: () => {
    throw new Error('Ensure <CogsConnectionProvider> has been added to your React app');
  },
  useAudioPlayer: () => {
    throw new Error('Ensure <CogsConnectionProvider> has been added to your React app');
  },
  useVideoPlayer: () => {
    throw new Error('Ensure <CogsConnectionProvider> has been added to your React app');
  },
});

/**
 * Create a persistent connection to COGS which can be accessed with `useCogsConnection()`
 * @param audioPlayer Creates a `CogsAudioPlayer` than can be accessed with `useAudioPlayer()`
 *
 * Note: If unset, the audio player will remain active.
 *
 * @param videoPlayer Creates a `CogsVideoPlayer` than can be accessed with `useVideoPlayer()`
 *
 * Note: If unset, the video player will remain active.
 *
 * *Example:*
 *
 * ```jsx
 * import manifest from './cogs-plugin-manifest.js';
 *
 * function MyComponent() {
 *   const cogsConnection = useCogsConnection();
 *   const numberOfPlayers = useCogsConfig(cogsConnection)['Number of players'];
 *
 *   return <div>Players: {numberOfPlayers}</div>;
 * }
 *
 * function App() {
 *   return <CogsConnectionProvider manifest={manifest} audioPlayer videoPlayer>
 *     <MyComponent />
 *   <CogsConnectionProvider/>;
 * }
 * ```
 *
 * or with Typescript:
 *
 * ```tsx
 * import manifest from './cogs-plugin-manifest.js'; // Requires `"allowJs": true` in `tsconfig.json`
 *
 * function MyComponent() {
 *   const cogsConnection = useCogsConnection<typeof manifest>();
 *   const numberOfPlayers = useCogsConfig(cogsConnection)['Number of players'];
 *
 *   return <div>Players: {numberOfPlayers}</div>;
 * }
 *
 * function App() {
 *   return <CogsConnectionProvider manifest={manifest} audioPlayer videoPlayer>
 *     <MyComponent />
 *   <CogsConnectionProvider/>;
 * }
 * ```
 */
export default function CogsConnectionProvider<Manifest extends CogsPluginManifest>({
  manifest,
  hostname,
  port,
  children,
  audioPlayer,
  videoPlayer,
}: {
  manifest: Manifest;
  hostname?: string;
  port?: number;
  children: React.ReactNode;
  audioPlayer?: boolean;
  videoPlayer?: boolean;
}): JSX.Element | null {
  const connectionRef = useRef<CogsConnection<Manifest>>();
  const [, forceRender] = useState({});

  useEffect(() => {
    const connection = new CogsConnection(manifest, { hostname, port });
    connectionRef.current = connection;
    forceRender({});
    return () => {
      connectionRef.current = undefined;
      connection.close();
    };
  }, [manifest, hostname, port]);

  const audioPlayerRef = useRef<CogsAudioPlayer>();
  useEffect(() => {
    if (audioPlayer && !audioPlayerRef.current && connectionRef.current) {
      audioPlayerRef.current = new CogsAudioPlayer(connectionRef.current);
    }
  }, [audioPlayer]);

  const videoPlayerRef = useRef<CogsVideoPlayer>();
  useEffect(() => {
    if (videoPlayer && !videoPlayerRef.current && connectionRef.current) {
      videoPlayerRef.current = new CogsVideoPlayer(connectionRef.current);
    }
  }, [videoPlayer]);

  if (!connectionRef.current) {
    // Do not render if the `useEffect`s above have not run
    return null;
  }

  const value: CogsConnectionContextValue<Manifest> = {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    useCogsConnection: () => connectionRef.current!,
    useAudioPlayer: () => audioPlayerRef.current ?? null,
    useVideoPlayer: () => videoPlayerRef.current ?? null,
  };

  return <CogsConnectionContext.Provider value={value}>{children}</CogsConnectionContext.Provider>;
}

/**
 * Get the connection from `<CogsConnectionProvider>`
 */
export function useCogsConnection<Manifest extends CogsPluginManifest>(): CogsConnection<Manifest> {
  return useContext(CogsConnectionContext as React.Context<CogsConnectionContextValue<Manifest>>).useCogsConnection();
}

/**
 * Get the audio player from `<CogsConnectionProvider audioPlayer>`
 */
export function useAudioPlayer<Manifest extends CogsPluginManifest>(): CogsAudioPlayer | null {
  return useContext(CogsConnectionContext as React.Context<CogsConnectionContextValue<Manifest>>).useAudioPlayer();
}

/**
 * Get the video player from `<CogsConnectionProvider videoPlayer>`
 */
export function useVideoPlayer<Manifest extends CogsPluginManifest>(): CogsVideoPlayer | null {
  return useContext(CogsConnectionContext as React.Context<CogsConnectionContextValue<Manifest>>).useVideoPlayer();
}
