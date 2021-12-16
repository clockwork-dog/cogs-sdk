import { CogsConnection } from '@clockworkdog/cogs-client';
import React, { useContext, useEffect, useRef, useState } from 'react';

type CogsConnectionCustomTypes<Connection> = Connection extends CogsConnection<infer T> ? T : never;

type CogsConnectionContextValue<CustomTypes extends CogsConnectionCustomTypes<CogsConnection> = Record<never, never>> = {
  useCogsConnection: () => CogsConnection<CustomTypes>;
};

const CogsConnectionContext = React.createContext<CogsConnectionContextValue>({
  useCogsConnection: () => {
    throw new Error('Please use with <CogsConnectionProvider>');
  },
});

/**
 * Create a persistent connection to COGS which can be accessed with `useCogsConnection()`
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
 *   return <CogsConnectionProvider>
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
 *   return <CogsConnectionProvider>
 *     <MyComponent />
 *   <CogsConnectionProvider/>;
 * }
 * ```
 */
export default function CogsConnectionProvider({
  hostname,
  port,
  children,
}: {
  hostname?: string;
  port?: number;
  children: React.ReactNode;
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

  if (!connectionRef.current) {
    // Do not render if the `useEffect` above has not run
    return null;
  }

  const value: CogsConnectionContextValue = {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    useCogsConnection: () => connectionRef.current!,
  };

  return <CogsConnectionContext.Provider value={value}>{children}</CogsConnectionContext.Provider>;
}

/**
 * Get the connection from `<CogsConnectionProvider>`
 */
export function useCogsConnection<CustomTypes extends CogsConnectionCustomTypes<CogsConnection>>(): CogsConnection<CustomTypes> {
  return useContext(CogsConnectionContext as React.Context<CogsConnectionContextValue<CustomTypes>>).useCogsConnection();
}
