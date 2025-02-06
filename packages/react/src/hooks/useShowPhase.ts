import { CogsConnection, ShowPhase } from '@clockworkdog/cogs-client';
import { useEffect, useState } from 'react';

export default function useShowPhase<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Connection extends CogsConnection<any>,
>(connection: Connection): ShowPhase {
  const [status, setStatus] = useState(connection.showPhase);

  useEffect(() => {
    // Use the latest show phase in case it has changed before this useEffect ran
    setStatus(connection.showPhase);

    const listener = () => setStatus(connection.showPhase);
    connection.addEventListener('showPhase', listener);
    return () => connection.removeEventListener('showPhase', listener);
  }, [connection]);

  return status;
}
