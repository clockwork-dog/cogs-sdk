import { CogsConnection } from '@clockworkdog/cogs-client';
import { useEffect, useState } from 'react';

export default function useIsConnected(connection: CogsConnection): boolean {
  const [isConnected, setConnected] = useState(connection.isConnected);

  useEffect(() => {
    const handleConnected = () => setConnected(true);
    const handleDisconnected = () => setConnected(false);
    connection.addEventListener('open', handleConnected);
    connection.addEventListener('close', handleDisconnected);
    return () => {
      connection.removeEventListener('open', handleConnected);
      connection.removeEventListener('close', handleDisconnected);
    };
  }, [connection]);

  return isConnected;
}
