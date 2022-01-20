import { CogsAudioPlayer, CogsConnection, CogsVideoPlayer } from '@clockworkdog/cogs-client';
import React, { useContext, useEffect, useRef, useState } from 'react';

type CogsConnectionCustomTypes<Connection> = Connection extends CogsConnection<infer T> ? T : never;

type CogsConnectionContextValue<CustomTypes extends CogsConnectionCustomTypes<CogsConnection> = Record<never, never>> = {
  useCogsConnection: () => CogsConnection<CustomTypes>;
  useAudioPlayer: () => CogsAudioPlayer | null;
  useVideoPlayer: () => CogsVideoPlayer | null;
};

const CogsConnectionContext = React.createContext<CogsConnectionContextValue>({
  useCogsConnection: () => undefined as any,
  useAudioPlayer: () => undefined as any,
  useVideoPlayer: () => undefined as any,
});

/**
 * Create a persistent connection to COGS which can be accessed with `useCogsConnection()`
 * @param audioPlayer Creates a `CogsAudioPlayer` than can be accessed with `useAudioPlayer()`
 * @param videoPlayer Creates a `CogsVideoPlayer` than can be accessed with `useVideoPlayer()`
 *
 * ```jsx
 * function MyComponent() {
 *   const cogsConnection = useCogsConnection();
 *   const numberOfPlayers = useCogsConfig(cogsConnection)['Number of players'];
 *
 *   return <div>Players: {numberOfPlayers}</div>;
 * }
 *
 * function App() {
 *   return <CogsConnectionProvider audioPlayer videoPlayer>
 *     <MyComponent />
 *   <CogsConnectionProvider/>;
 * }
 * ```
 *
 * or with Typescript:
 *
 * ```tsx
 * type CogsProjectDataTypes = {
 *   config: { 'Number of players': number }
 * };
 *
 * function MyComponent() {
 *   const cogsConnection = useCogsConnection<CogsProjectDataTypes>();
 *   const numberOfPlayers = useCogsConfig(cogsConnection)['Number of players'];
 *
 *   return <div>Players: {numberOfPlayers}</div>;
 * }
 *
 * function App() {
 *   return <CogsConnectionProvider audioPlayer videoPlayer>
 *     <MyComponent />
 *   <CogsConnectionProvider/>;
 * }
 * ```
 */
export default function CogsConnectionProvider({
  hostname,
  port,
  children,
  audioPlayer,
  videoPlayer,
}: {
  hostname?: string;
  port?: number;
  children: React.ReactNode;
  audioPlayer?: boolean;
  videoPlayer?: boolean;
}): JSX.Element | null {
  const connectionRef = useRef<CogsConnection>();
  const [, forceRender] = useState({});

  useEffect(() => {
    const connection = new CogsConnection({ hostname, port });
    connectionRef.current = connection;
    forceRender({});
    return () => {
      connectionRef.current = undefined;
      connection.close();
    };
  }, [hostname, port]);

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

  const value: CogsConnectionContextValue = {
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
export function useCogsConnection<CustomTypes extends CogsConnectionCustomTypes<CogsConnection>>(): CogsConnection<CustomTypes> {
  return useContext(CogsConnectionContext as React.Context<CogsConnectionContextValue<CustomTypes>>).useCogsConnection();
}

/**
 * Get the audio player from `<CogsConnectionProvider audioPlayer>`
 */
export function useAudioPlayer(): CogsAudioPlayer | null {
  return useContext(CogsConnectionContext as React.Context<CogsConnectionContextValue>).useAudioPlayer();
}

/**
 * Get the video player from `<CogsConnectionProvider audioPlayer>`
 */
export function useVideoPlayer(): CogsVideoPlayer | null {
  return useContext(CogsConnectionContext as React.Context<CogsConnectionContextValue>).useVideoPlayer();
}
