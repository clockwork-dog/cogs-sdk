import { CogsConnection } from '@clockworkdog/cogs-client';
import { useEffect, useState } from 'react';

type ConfigType<Connection> = Connection extends CogsConnection<infer Types> ? Types['config'] : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function useCogsConfig<Connection extends CogsConnection<any>>(connection: Connection): ConfigType<Connection> {
  const [config, setConfig] = useState<ConfigType<Connection>>(connection.config);

  useEffect(() => {
    const listener = () => setConfig(connection.config);
    connection.addEventListener('config', listener);
    return () => connection.removeEventListener('config', listener);
  }, [connection]);

  return config;
}
