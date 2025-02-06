import { CogsConfigChangedEvent, CogsConnection } from '@clockworkdog/cogs-client';
import { useEffect, useState } from 'react';

export default function useCogsConfig<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Connection extends CogsConnection<any>,
>(connection: Connection): Connection['config'] {
  const [config, setConfig] = useState<Connection['config']>(connection.config);

  useEffect(() => {
    // Use the latest config in case it has changed before this useEffect ran
    setConfig(connection.config);

    const listener = (event: CogsConfigChangedEvent<Connection['config']>) => setConfig(event.config);
    connection.addEventListener('config', listener);
    return () => connection.removeEventListener('config', listener);
  }, [connection]);

  return config;
}
