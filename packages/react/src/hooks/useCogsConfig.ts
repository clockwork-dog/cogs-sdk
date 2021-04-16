import { CogsConnection, ConfigValue } from '@clockworkdog/cogs-client';
import { useEffect } from 'react';

export default function useCogsConfig(connection: CogsConnection, handleConfig: (config: { [configKey: string]: ConfigValue }) => void): void {
  useEffect(() => {
    const listener = (event: CustomEvent<{ [configKey: string]: ConfigValue }>) => {
      handleConfig(event.detail);
    };

    connection.addEventListener('config', listener);
    return () => connection.removeEventListener('config', listener);
  }, [connection, handleConfig]);
}
