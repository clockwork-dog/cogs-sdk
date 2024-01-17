import { CogsClientMessage, CogsConnection, ShowPhase } from '@clockworkdog/cogs-client';
import { useCallback, useState } from 'react';
import useCogsMessage from './useCogsMessage';

export default function useShowPhase<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Connection extends CogsConnection<any>
>(connection: Connection): ShowPhase {
  const [status, setStatus] = useState(connection.showPhase);

  useCogsMessage(
    connection,
    useCallback((message: CogsClientMessage) => {
      if (message.type === 'show_phase') {
        setStatus(message.phase);
      }
    }, [])
  );

  return status;
}
