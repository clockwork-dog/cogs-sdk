import { CogsConnection, CogsPluginManifest, ManifestTypes } from '@clockworkdog/cogs-client';
import React, { ReactNode, useContext, useEffect, useRef, useState } from 'react';

type CogsConnectionContextValue<Manifest extends CogsPluginManifest> = {
  useCogsConnection: (customConnection?: CogsConnection<Manifest>) => CogsConnection<Manifest>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CogsConnectionContext = React.createContext<CogsConnectionContextValue<any>>({
  useCogsConnection: (customConnection) => {
    if (!customConnection) {
      throw new Error('Ensure <CogsConnectionProvider> has been added to your React app');
    }
    return customConnection;
  },
});

/**
 * Create a persistent connection to COGS which can be accessed with `useCogsConnection()`
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
 *   return <CogsConnectionProvider manifest={manifest}>
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
 *   return <CogsConnectionProvider manifest={manifest}>
 *     <MyComponent />
 *   <CogsConnectionProvider/>;
 * }
 * ```
 */
export default function CogsConnectionProvider<
  Manifest extends CogsPluginManifest,
  DataT extends { [key: string]: unknown } = { [key: string]: unknown },
>({
  manifest,
  hostname,
  port,
  children,
  initialClientState,
  initialDataStoreData,
}: {
  manifest: Manifest;
  hostname?: string;
  port?: number;
  children: React.ReactNode;
  initialClientState?: Partial<ManifestTypes.StateAsObject<Manifest, { writableFromClient: true }>>;
  initialDataStoreData?: DataT;
}): ReactNode | null {
  const connectionRef = useRef<CogsConnection<Manifest>>(undefined);
  const [, forceRender] = useState({});

  useEffect(() => {
    const connection = new CogsConnection(manifest, { hostname, port }, initialClientState, initialDataStoreData);
    connectionRef.current = connection;
    forceRender({});
    return () => {
      connectionRef.current = undefined;
      connection.close();
    };
  }, [manifest, hostname, port, initialClientState, initialDataStoreData]);

  if (!connectionRef.current) {
    // Do not render if the `useEffect`s above have not run
    return null;
  }

  const value: CogsConnectionContextValue<Manifest> = {
    useCogsConnection: (customConnection) => customConnection ?? connectionRef.current!,
  };

  return <CogsConnectionContext.Provider value={value}>{children}</CogsConnectionContext.Provider>;
}

/**
 * Get the connection from `<CogsConnectionProvider>`
 */
export function useCogsConnection<Manifest extends CogsPluginManifest>(customConnection?: CogsConnection<Manifest>): CogsConnection<Manifest> {
  return useContext(CogsConnectionContext as React.Context<CogsConnectionContextValue<Manifest>>).useCogsConnection(customConnection);
}
