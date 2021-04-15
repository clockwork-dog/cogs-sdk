import { CogsClientMessage, CogsConnection } from '@clockworkdog/cogs-client';
import { useEffect } from 'react';

export default function useCogsMessage(connection: CogsConnection, handleMessage: (message: CogsClientMessage) => void): void {
  useEffect(() => {
    const listener = (event: CustomEvent<CogsClientMessage>) => {
      handleMessage(event.detail);
    };

    connection.addEventListener('message', listener);
    return () => connection.removeEventListener('message', listener);
  }, [connection, handleMessage]);
}
