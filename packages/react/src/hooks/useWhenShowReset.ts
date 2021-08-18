import { CogsClientMessage, CogsConnection } from '@clockworkdog/cogs-client';
import { useCallback } from 'react';
import useCogsMessage from './useCogsMessage';

export default function useWhenShowReset(connection: CogsConnection, whenReset: () => void): void {
  useCogsMessage(
    connection,
    useCallback(
      (message: CogsClientMessage) => {
        if (message.type === 'show_reset') {
          whenReset();
        }
      },
      [whenReset]
    )
  );
}
