import { CogsConnection } from '@clockworkdog/cogs-client';
import { EventValue } from '@clockworkdog/cogs-client/dist/types/Callbacks';
import { useEffect } from 'react';

export default function useCogsEvent(connection: CogsConnection, handleEvent: (event: { key: string; value?: EventValue }) => void): void {
  useEffect(() => {
    const listener = (event: CustomEvent<{ key: string; value?: EventValue }>) => {
      handleEvent(event.detail);
    };

    connection.addEventListener('event', listener);
    return () => connection.removeEventListener('event', listener);
  }, [connection, handleEvent]);
}
