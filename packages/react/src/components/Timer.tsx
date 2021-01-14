import React from 'react';
import { CogsClientMessage } from '@clockworkdog/cogs-client';
import { useCallback, useEffect, useState } from 'react';
import CogsConnectionHandler from '../types/CogsConnectionHandler';

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
  connection,
  separator = ':',
  center,
}: {
  className?: string;
  style?: React.CSSProperties;
  connection: CogsConnectionHandler;
  separator?: string;
  center?: boolean;
}): JSX.Element {
  const [timerElapsed, setTimerElapsed] = useState(0);
  const [timerStartedAt, setTimerStartedAt] = useState(0);
  const [timerTotalMillis, setTimerTotalMillis] = useState(0);
  const [timerTicking, setTimerTicking] = useState(false);

  const updateTimer = useCallback(() => {
    const timerElapsed = timerTicking ? Date.now() - timerStartedAt : 0;
    setTimerElapsed(timerElapsed);
  }, [timerTicking, timerStartedAt]);

  const startTimer = useCallback((durationMillis: number) => {
    setTimerStartedAt(Date.now());
    setTimerTotalMillis(durationMillis);
    setTimerTicking(true);
  }, []);

  useEffect(() => {
    if (timerTicking) {
      updateTimer();
    }
  }, [timerTicking, updateTimer]);

  const stopTimer = useCallback((durationMillis: number) => {
    setTimerTotalMillis(durationMillis);
    setTimerTicking(false);
  }, []);

  const setTimer = useCallback((durationMillis: number, startedAtOffset?: number) => {
    if (startedAtOffset) {
      setTimerStartedAt((startedAt) => startedAt + startedAtOffset);
    }
    setTimerTotalMillis(durationMillis);
  }, []);

  useEffect(() => {
    if (timerTicking) {
      const ticker = setInterval(updateTimer, 100);
      return () => {
        clearInterval(ticker);
      };
    }

    return;
  }, [timerTicking, updateTimer]);

  const onMessage = useCallback(
    (message: CogsClientMessage) => {
      switch (message.type) {
        case 'subscription_timer_started':
          startTimer(message.durationMillis);
          break;
        case 'subscription_timer_stopped':
          stopTimer(message.durationMillis);
          break;
        case 'subscription_timer_set':
          setTimer(message.durationMillis, message.startedAtOffset);
          break;
      }
    },
    [startTimer, stopTimer, setTimer]
  );

  useEffect(() => {
    const handler = { onMessage };
    connection.addHandler(handler);
    return () => {
      connection.removeHandler(handler);
    };
  }, [connection, onMessage]);

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
