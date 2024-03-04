import { CogsAudioPlayer, CogsConnection, CogsPluginManifest, CogsVideoPlayer } from '@clockworkdog/cogs-client';
import React, { useContext, useEffect, useRef, useState } from 'react';

type CogsConnectionContextValue<Manifest extends CogsPluginManifest> = {
  useCogsConnection: (customConnection?: CogsConnection<Manifest>) => CogsConnection<Manifest>;
  useAudioPlayer: (customAudioPlayer?: CogsAudioPlayer) => CogsAudioPlayer | null;
  useVideoPlayer: (customVideoPlayer?: CogsVideoPlayer) => CogsVideoPlayer | null;
};

const CogsConnectionContext = React.createContext<CogsConnectionContextValue<any>>({
  useCogsConnection: (customConnection) => {
    if (!customConnection) {
      throw new Error('Ensure <CogsConnectionProvider> has been added to your React app');
    }
    return customConnection;
  },
  useAudioPlayer: (customAudioPlayer) => {
    if (!customAudioPlayer) {
      throw new Error('Ensure <CogsConnectionProvider> has been added to your React app');
    }
    return customAudioPlayer;
  },
  useVideoPlayer: (customVideoPlayer) => {
    if (!customVideoPlayer) {
      throw new Error('Ensure <CogsConnectionProvider> has been added to your React app');
    }
    return customVideoPlayer;
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
    useCogsConnection: (customConnection) => customConnection ?? connectionRef.current!,
    useAudioPlayer: (customAudioPlayer) => customAudioPlayer ?? audioPlayerRef.current ?? null,
    useVideoPlayer: (customVideoPlayer) => customVideoPlayer ?? videoPlayerRef.current ?? null,
  };

  return <CogsConnectionContext.Provider value={value}>{children}</CogsConnectionContext.Provider>;
}

/**
 * Get the connection from `<CogsConnectionProvider>`
 */
export function useCogsConnection<Manifest extends CogsPluginManifest>(customConnection?: CogsConnection<Manifest>): CogsConnection<Manifest> {
  return useContext(CogsConnectionContext as React.Context<CogsConnectionContextValue<Manifest>>).useCogsConnection(customConnection);
}

/**
 * Get the audio player from `<CogsConnectionProvider audioPlayer>`
 */
export function useAudioPlayer<Manifest extends CogsPluginManifest>(customAudioPlayer?: CogsAudioPlayer): CogsAudioPlayer | null {
  return useContext(CogsConnectionContext as React.Context<CogsConnectionContextValue<Manifest>>).useAudioPlayer(customAudioPlayer);
}

/**
 * Get the video player from `<CogsConnectionProvider videoPlayer>`
 */
export function useVideoPlayer<Manifest extends CogsPluginManifest>(customVideoPlayer?: CogsVideoPlayer): CogsVideoPlayer | null {
  return useContext(CogsConnectionContext as React.Context<CogsConnectionContextValue<Manifest>>).useVideoPlayer(customVideoPlayer);
}
