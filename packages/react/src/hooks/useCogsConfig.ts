import { CogsConfigChangedEvent, CogsConnection } from '@clockworkdog/cogs-client';
import { useEffect, useState } from 'react';

export default function useCogsConfig<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Connection extends CogsConnection<any>
>(connection: Connection): Connection['config'] {
  const [config, setConfig] = useState<Connection['config']>(connection.config);

  useEffect(() => {
    const listener = (event: CogsConfigChangedEvent<Connection['config']>) => setConfig(event.config);
    connection.addEventListener('config', listener);
    setConfig(connection.config); // Use the latest config in case is has changed before this useEffect ran
    return () => connection.removeEventListener('config', listener);
  }, [connection]);

  return config;
}
