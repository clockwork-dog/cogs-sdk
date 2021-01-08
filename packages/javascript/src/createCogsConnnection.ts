import Callbacks, { EventValue, UpdateValue } from './types/Callbacks';
import ReconnectingWebSocket from 'reconnecting-websocket';

export interface CogsConnection {
  sendEvent: (eventKey: string, eventValue?: EventValue) => void;
  sendUpdates: (updates: { [port: string]: UpdateValue }) => void;
  close: () => void;
}

export default function createCogsWebsocket(callbacks: Callbacks): CogsConnection {
  const parsedURL = new URL(document.location.href);

  const isSimulator = parsedURL.searchParams.get('simulator') === 'true';
  const serial = parsedURL.searchParams.get('serial');
  const name = parsedURL.searchParams.get('name');
  const pathname = isSimulator ? `/simulator/${name}` : `/client/${serial}`;

  // Remove extra info from params which is now part of path
  parsedURL.searchParams.delete('serial');
  parsedURL.searchParams.delete('simulator');
  parsedURL.searchParams.delete('name');

  const socketUrl = `ws://${parsedURL.host}${pathname}${parsedURL.search}`;

  const websocket = isSimulator ? new ReconnectingWebSocket(socketUrl) : new WebSocket(socketUrl);

  websocket.onopen = () => {
    callbacks.onSocketOpen && callbacks.onSocketOpen();
  };

  websocket.onclose = () => {
    callbacks.onSocketClose?.();
  };

  websocket.onmessage = ({ data }) => {
    try {
      const parsed = JSON.parse(data);

      try {
        if (parsed.config) {
          callbacks.onConfig?.(parsed.config);
        } else if (parsed.updates) {
          callbacks.onUpdates?.(parsed.updates);
        } else if (parsed.event && parsed.event.key) {
          callbacks.onEvent?.(parsed.event.key, parsed.event.value);
        } else if (typeof parsed.message === 'object') {
          callbacks.onMessage?.(parsed.message);
        }
      } catch (e) {
        console.warn('Error handling data', data, e);
      }
    } catch (e) {
      console.error('Unable to parse incoming data from server', data, e);
    }
  };

  function sendEvent(eventKey: string, eventValue?: EventValue) {
    websocket.send(
      JSON.stringify({
        event: {
          key: eventKey,
          value: eventValue,
        },
      })
    );
  }

  function sendUpdates(updates: { [port: string]: UpdateValue }) {
    websocket.send(JSON.stringify({ updates }));
  }

  function close() {
    websocket.close();
  }

  return { sendEvent, sendUpdates, close };
}
