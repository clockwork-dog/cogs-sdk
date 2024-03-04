import { CogsConnection } from '@clockworkdog/cogs-client';
import React from 'react';
import useHint from '../hooks/useHint';
import { useCogsConnection } from '../providers/CogsConnectionProvider';

export default function Hint({
  connection: customConnection,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connection: CogsConnection<any>;
}): JSX.Element | null {
  const connection = useCogsConnection(customConnection);
  const hint = useHint(connection);
  return hint ? <>{hint}</> : null;
}
