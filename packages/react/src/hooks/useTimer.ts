import { CogsClientMessage } from '@clockworkdog/cogs-client';
import { useCallback, useEffect, useRef, useState } from 'react';
import CogsConnectionHandler from '../types/CogsConnectionHandler';

function formatTime(time: number, countingUp: boolean, separator = ':') {
  const negative = time < 0;

  // Flip things for negative times
  if (negative) {
    countingUp = !countingUp;
    time = 0 - time;
  }

  const roundedTime = countingUp ? Math.floor(time / 1000) * 1000 : Math.ceil(time / 1000) * 1000;
  const minutes = String(Math.floor(roundedTime / 1000 / 60)).padStart(2, '0');
  const seconds = String((roundedTime / 1000) % 60).padStart(2, '0');

  // No negative sign for 00:00
  return `${negative && time >= 1000 ? '-' : ''}${minutes}${separator}${seconds}`;
}

export default function useTimer({ connection, separator }: { connection: CogsConnectionHandler; separator?: string }): string {
  const tickerRef = useRef<number>();

  const [timerElapsed, setTimerElapsed] = useState(0);
  const [timerStartedAt, setTimerStartedAt] = useState(0);
  const [timerTotalMillis, setTimerTotalMillis] = useState(0);
  const [timerTicking, setTimerTicking] = useState(false);

  const updateTimer = useCallback(() => {
    const timerElapsed = timerTicking ? Date.now() - timerStartedAt : 0;
    setTimerElapsed(timerElapsed);
  }, [timerTicking, timerStartedAt]);

  const startTimer = useCallback(
    (durationMillis: number) => {
      setTimerStartedAt(Date.now());
      setTimerTotalMillis(durationMillis);
      updateTimer();
      setTimerTicking(true);
    },
    [updateTimer]
  );

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
    tickerRef.current && clearInterval(tickerRef.current);

    if (timerTicking) {
      tickerRef.current = setInterval(updateTimer, 100);
    }

    return () => {
      tickerRef.current && clearInterval(tickerRef.current);
    };
  }, [timerTicking, timerStartedAt, timerTotalMillis, updateTimer]);

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
  return formatTime(time, false, separator);
}
