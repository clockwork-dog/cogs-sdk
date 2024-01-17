import { CogsClientMessage, CogsConnection } from '@clockworkdog/cogs-client';
import { useCallback } from 'react';
import useCogsMessage from './useCogsMessage';

export default function useWhenShowReset<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Connection extends CogsConnection<any>
>(connection: Connection, whenReset: () => void): void {
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
