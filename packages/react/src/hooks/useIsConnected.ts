import { CogsConnection } from '@clockworkdog/cogs-client';
import { useEffect, useState } from 'react';

export default function useIsConnected(connection: CogsConnection): boolean {
  const [isConnected, setConnected] = useState(connection.isConnected);

  useEffect(() => {
    // The connection may have opened in between the useState initialization above
    // and this useEffect logic running so use the latest state from the connection
    setConnected(connection.isConnected);

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
