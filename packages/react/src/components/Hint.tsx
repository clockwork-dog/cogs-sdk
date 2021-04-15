import { CogsConnection } from '@clockworkdog/cogs-client';
import React from 'react';
import useHint from '../hooks/useHint';

export default function Hint({ connection }: { connection: CogsConnection }): JSX.Element | null {
  const hint = useHint(connection);
  return hint ? <>{hint}</> : null;
}
