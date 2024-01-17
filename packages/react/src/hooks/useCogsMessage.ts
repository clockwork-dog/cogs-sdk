import { CogsClientMessage, CogsConnection, CogsMessageEvent } from '@clockworkdog/cogs-client';
import { useEffect } from 'react';

export default function useCogsMessage<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Connection extends CogsConnection<any>
>(connection: Connection, handleMessage: (message: CogsClientMessage) => void): void {
  useEffect(() => {
    const listener = (event: CogsMessageEvent) => {
      handleMessage(event.message);
    };

    connection.addEventListener('message', listener);
    return () => connection.removeEventListener('message', listener);
  }, [connection, handleMessage]);
}
