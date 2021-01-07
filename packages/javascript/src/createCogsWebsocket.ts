import Callbacks from './types/Callbacks';

export default function createCogsWebsocket(callbacks: Callbacks): WebSocket {
  const parsedURL = new URL(document.location.href);

  const isSimulator = parsedURL.searchParams.get('simulator') === 'true';
  const serial = parsedURL.searchParams.get('serial');
  const name = parsedURL.searchParams.get('name');
  const pathname = isSimulator ? `/simulator/${name}` : `/client/${serial}`;

  // Remove extra info from params which is now part of path
  parsedURL.searchParams.delete('serial');
  parsedURL.searchParams.delete('simulator');
  parsedURL.searchParams.delete('name');

  const socketURL = `ws://${parsedURL.host}${pathname}${parsedURL.search}`;

  const websocket = new WebSocket(socketURL);

  websocket.onopen = () => {
    callbacks.onSocketOpen && callbacks.onSocketOpen();
  };

  websocket.onclose = () => {
    callbacks.onSocketClose?.();
  };

  websocket.onmessage = ({ data }) => {
    try {
      const parsed = JSON.parse(data);

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
      console.error('Unable to parse incoming data from server', data, e);
    }
  };

  return websocket;
}
