import { ConfigValue, EventValue, UpdateValue } from './types/valueTypes';
import ReconnectingWebSocket from 'reconnecting-websocket';
import CogsClientMessage from './types/CogsClientMessage';
import { COGS_SERVER_PORT } from './helpers/urls';

type EventTypes = {
  message: CogsClientMessage;
  config: { [configKey: string]: ConfigValue };
  updates: { [port: string]: UpdateValue };
  event: { key: string; value?: EventValue };
  open: undefined;
  close: undefined;
};

export default class CogsConnection {
  private websocket: WebSocket | ReconnectingWebSocket;
  private eventTarget = new EventTarget();

  constructor({ hostname = document.location.hostname, port = COGS_SERVER_PORT }: { hostname?: string; port?: number } = {}) {
    const { useReconnectingWebsocket, path, pathParams } = websocketParametersFromUrl(document.location.href);
    const socketUrl = `ws://${hostname}:${port}${path}?${pathParams}`;
    this.websocket = useReconnectingWebsocket ? new ReconnectingWebSocket(socketUrl) : new WebSocket(socketUrl);

    this.websocket.onopen = () => {
      this.dispatchEvent('open', undefined);
    };

    this.websocket.onclose = () => {
      this.dispatchEvent('close', undefined);
    };

    this.websocket.onmessage = ({ data }) => {
      try {
        const parsed = JSON.parse(data);

        try {
          if (parsed.config) {
            this.dispatchEvent('config', parsed.config);
          } else if (parsed.updates) {
            this.dispatchEvent('updates', parsed.updates);
          } else if (parsed.event && parsed.event.key) {
            this.dispatchEvent('event', parsed.event);
          } else if (typeof parsed.message === 'object') {
            this.dispatchEvent('message', parsed.message);
          }
        } catch (e) {
          console.warn('Error handling data', data, e);
        }
      } catch (e) {
        console.error('Unable to parse incoming data from server', data, e);
      }
    };
  }

  public get isConnected(): boolean {
    return this.websocket.readyState === WebSocket.OPEN;
  }

  public sendEvent(eventKey: string, eventValue?: EventValue): void {
    if (this.isConnected) {
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
    if (this.isConnected) {
      this.websocket.send(JSON.stringify({ updates }));
    }
  }

  // Type-safe wrapper around EventTarget
  public addEventListener<EventName extends keyof EventTypes, EventValue extends EventTypes[EventName]>(
    type: EventName,
    listener: (value: CustomEvent<EventValue>) => void,
    options?: boolean | AddEventListenerOptions
  ): void {
    this.eventTarget.addEventListener(type, listener as EventListener, options);
  }
  public removeEventListener<EventName extends keyof EventTypes>(
    type: EventName,
    listener: (ev: CustomEvent<EventTypes[EventName]>) => void,
    options?: boolean | EventListenerOptions
  ): void {
    this.eventTarget.removeEventListener(type, listener as EventListener, options);
  }
  private dispatchEvent<EventName extends keyof EventTypes>(type: EventName, detail: EventTypes[EventName]): void {
    this.eventTarget.dispatchEvent(new CustomEvent(type, { detail }));
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
