import Callbacks, { EventValue, UpdateValue } from './types/Callbacks';
import ReconnectingWebSocket from 'reconnecting-websocket';

export interface CogsConnection {
  sendEvent: (eventKey: string, eventValue?: EventValue) => void;
  sendUpdates: (updates: { [port: string]: UpdateValue }) => void;
  close: () => void;
}

function websocketParametersFromUrl(url: string): { path: string; pathParams: URLSearchParams; useReconnectingWebsocket?: boolean } {
  const parsedUrl = new URL(url);
  const pathParams = new URLSearchParams(parsedUrl.searchParams);
  const localClientId = pathParams.get('local_id');
  const isSimulator = pathParams.get('simulator') === 'true';

  if (localClientId) {
    const type = pathParams.get('t') ?? '';
    pathParams.delete('local_id');
    return {
      path: `/client/local/${encodeURIComponent(localClientId)}`,
      pathParams: new URLSearchParams({ t: type }),
      useReconnectingWebsocket: true,
    };
  } else if (isSimulator) {
    const name = pathParams.get('name') ?? '';
    pathParams.delete('simulator');
    pathParams.delete('name');
    return { path: `/simulator/${encodeURIComponent(name)}`, pathParams, useReconnectingWebsocket: true };
  } else {
    const serial = pathParams.get('serial') ?? '';
    pathParams.delete('serial');
    return { path: `/client/${encodeURIComponent(serial)}`, pathParams };
  }
}

export default function createCogsWebsocket(callbacks: Callbacks, { host = document.location.host }: { host?: string } = {}): CogsConnection {
  const { useReconnectingWebsocket, path, pathParams } = websocketParametersFromUrl(document.location.href);
  const socketUrl = `ws://${host}${path}?${pathParams}`;
  const websocket = useReconnectingWebsocket ? new ReconnectingWebSocket(socketUrl) : new WebSocket(socketUrl);

  websocket.onopen = () => {
    callbacks.onSocketOpen?.();
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
    if (websocket.readyState === WebSocket.OPEN) {
      websocket.send(
        JSON.stringify({
          event: {
            key: eventKey,
            value: eventValue,
          },
        })
      );
    }
  }

  function sendUpdates(updates: { [port: string]: UpdateValue }) {
    if (websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({ updates }));
    }
  }

  function close() {
    websocket.close();
  }

  return { sendEvent, sendUpdates, close };
}
