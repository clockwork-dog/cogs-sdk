import { CogsClientMessage, CogsConnection, CogsPluginManifestJson, CogsPluginManifestJsonReadonly } from '@clockworkdog/cogs-client';
import { TimerState } from '@clockworkdog/cogs-client/dist/CogsConnection';
import React, { useCallback, useEffect, useState } from 'react';
import useCogsMessage from '../hooks/useCogsMessage';
import { useCogsConnection } from '../providers/CogsConnectionProvider';

function formatTime(time: number, countingUp: boolean) {
  const negative = time < 0;

  // Flip things for negative times
  if (negative) {
    countingUp = !countingUp;
    time = 0 - time;
  }

  const roundedTime = countingUp ? Math.floor(time / 1000) * 1000 : Math.ceil(time / 1000) * 1000;
  // No negative sign for 00:00
  const minutes = (negative && time >= 1000 ? '-' : '') + String(Math.floor(roundedTime / 1000 / 60)).padStart(2, '0');
  const seconds = String((roundedTime / 1000) % 60).padStart(2, '0');

  return { minutes, seconds };
}

export default function Timer({
  className,
  style,
  connection: customConnection,
  separator = ':',
  center,
}: {
  className?: string;
  style?: React.CSSProperties;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connection: CogsConnection<any>;
  separator?: string;
  center?: boolean;
}): JSX.Element {
  const providerConnection = useCogsConnection();
  const connection = customConnection ?? providerConnection;

  const [timerElapsed, setTimerElapsed] = useState(0);
  const [timerStartedAt, setTimerStartedAt] = useState(connection.timerState?.startedAt ?? 0);
  const [timerTotalMillis, setTimerTotalMillis] = useState(connection.timerState?.durationMillis ?? 0);
  const [timerTicking, setTimerTicking] = useState(connection.timerState?.ticking ?? false);

  const updateTimerElapsed = useCallback(() => {
    const timerElapsed = timerTicking ? Date.now() - timerStartedAt : 0;
    setTimerElapsed(timerElapsed);
  }, [timerTicking, timerStartedAt]);

  const updateTimerState = useCallback((timerState: TimerState) => {
    setTimerTotalMillis(timerState.durationMillis);
    setTimerTicking(timerState.ticking);

    if (timerState.ticking) {
      setTimerStartedAt(timerState.startedAt);
      setTimerElapsed(0);
    }
  }, []);

  // Deal with starting/stopping the visual ticking of the timer
  useEffect(() => {
    if (timerTicking) {
      updateTimerElapsed();

      const ticker = setInterval(updateTimerElapsed, 100);
      return () => {
        clearInterval(ticker);
      };
    }

    return;
  }, [timerTicking, updateTimerElapsed]);

  useCogsMessage(
    connection,
    useCallback(
      (message: CogsClientMessage) => {
        if (message.type === 'adjustable_timer_update') {
          updateTimerState({ startedAt: Date.now(), ticking: message.ticking, durationMillis: message.durationMillis });
        }
      },
      [updateTimerState]
    )
  );

  const time = timerTicking ? timerTotalMillis - timerElapsed : timerTotalMillis;
  const { minutes, seconds } = formatTime(time, false);

  return (
    <div className={className} style={center ? { display: 'flex', justifyContent: 'center', ...style } : style}>
      <span style={center ? { flexBasis: 0, flexGrow: 1, textAlign: 'right' } : undefined}>{minutes}</span>
      <span>{separator}</span>
      <span style={center ? { flexBasis: 0, flexGrow: 1, textAlign: 'left' } : undefined}>{seconds}</span>
    </div>
  );
}
