import { EventValue, UpdateValue } from './types/valueTypes';
import ReconnectingWebSocket from 'reconnecting-websocket';

export default class CogsConnection extends EventTarget {
  private websocket: WebSocket | ReconnectingWebSocket;

  constructor({ host = document.location.host }: { host?: string } = {}) {
    super();
    const { useReconnectingWebsocket, path, pathParams } = websocketParametersFromUrl(document.location.href);
    const socketUrl = `ws://${host}${path}?${pathParams}`;
    this.websocket = useReconnectingWebsocket ? new ReconnectingWebSocket(socketUrl) : new WebSocket(socketUrl);

    this.websocket.onopen = () => {
      this.dispatchEvent(new Event('open'));
    };

    this.websocket.onclose = () => {
      this.dispatchEvent(new Event('close'));
    };

    this.websocket.onmessage = ({ data }) => {
      try {
        const parsed = JSON.parse(data);

        try {
          if (parsed.config) {
            this.dispatchEvent(new CustomEvent('config', { detail: parsed.config }));
          } else if (parsed.updates) {
            this.dispatchEvent(new CustomEvent('updates', { detail: parsed.updates }));
          } else if (parsed.event && parsed.event.key) {
            this.dispatchEvent(new CustomEvent('event', { detail: parsed.event }));
          } else if (typeof parsed.message === 'object') {
            this.dispatchEvent(new CustomEvent('message', { detail: parsed.message }));
          }
        } catch (e) {
          console.warn('Error handling data', data, e);
        }
      } catch (e) {
        console.error('Unable to parse incoming data from server', data, e);
      }
    };
  }

  public sendEvent(eventKey: string, eventValue?: EventValue): void {
    if (this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(
        JSON.stringify({
          event: {
            key: eventKey,
            value: eventValue,
          },
        })
      );
    }
  }

  public sendUpdate(updates: { [port: string]: UpdateValue }): void {
    if (this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({ updates }));
    }
  }
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
