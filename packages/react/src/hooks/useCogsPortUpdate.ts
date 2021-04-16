import { CogsConnection, UpdateValue } from '@clockworkdog/cogs-client';
import { useEffect } from 'react';

export default function useCogsPortUpdate(connection: CogsConnection, handleUpdate: (update: { [port: string]: UpdateValue }) => void): void {
  useEffect(() => {
    const listener = (event: CustomEvent<{ [port: string]: UpdateValue }>) => {
      handleUpdate(event.detail);
    };

    connection.addEventListener('updates', listener);
    return () => connection.removeEventListener('updates', listener);
  }, [connection, handleUpdate]);
}
