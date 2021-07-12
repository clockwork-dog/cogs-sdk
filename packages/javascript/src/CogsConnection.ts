import { ConfigValue, EventValue, PortValue } from './types/valueTypes';
import ReconnectingWebSocket from 'reconnecting-websocket';
import CogsClientMessage from './types/CogsClientMessage';
import { COGS_SERVER_PORT } from './helpers/urls';

interface ConnectionEventListeners<
  CustomTypes extends {
    config?: { [configKey: string]: ConfigValue };
    inputPorts?: { [port: string]: PortValue };
    inputEvent?: { key: string; value?: EventValue };
  }
> {
  open: undefined;
  close: undefined;
  message: CogsClientMessage;
  config: CustomTypes['config'];
  updates: Partial<CustomTypes['inputPorts']>;
  event: CustomTypes['inputEvent'];
}

export default class CogsConnection<
  CustomTypes extends {
    config?: { [configKey: string]: ConfigValue };
    inputPorts?: { [port: string]: PortValue };
    outputPorts?: { [port: string]: PortValue };
    inputEvent?: { key: string; value?: EventValue };
    outputEvent?: { key: string; value?: EventValue };
  } = Record<never, never>
> {
  private websocket: WebSocket | ReconnectingWebSocket;
  private eventTarget = new EventTarget();

  private currentConfig: CustomTypes['config'] = {} as NonNullable<CustomTypes['config']>; // Received on open connection
  public get config(): CustomTypes['config'] {
    return { ...this.currentConfig };
  }

  private currentInputPortValues: CustomTypes['inputPorts'] = {} as NonNullable<CustomTypes['inputPorts']>; // Received on open connection
  public get inputPortValues(): CustomTypes['inputPorts'] {
    return { ...this.currentInputPortValues };
  }

  private currentOutputPortValues: CustomTypes['outputPorts'] = {} as NonNullable<CustomTypes['outputPorts']>; // Sent on open connection
  public get outputPortValues(): CustomTypes['outputPorts'] {
    return { ...this.currentOutputPortValues };
  }

  constructor(
    { hostname = document.location.hostname, port = COGS_SERVER_PORT }: { hostname?: string; port?: number } = {},
    outputPortValues: CustomTypes['outputPorts'] = undefined
  ) {
    this.currentOutputPortValues = { ...outputPortValues };
    const { useReconnectingWebsocket, path, pathParams } = websocketParametersFromUrl(document.location.href);
    const socketUrl = `ws://${hostname}:${port}${path}?${pathParams}`;
    this.websocket = useReconnectingWebsocket ? new ReconnectingWebSocket(socketUrl) : new WebSocket(socketUrl);

    this.websocket.onopen = () => {
      this.currentConfig = {} as CustomTypes['config']; // Received on open connection
      this.currentInputPortValues = {} as CustomTypes['inputPorts']; // Received on open connection

      this.dispatchEvent('open', undefined);
      this.setOutputPortValues(this.currentOutputPortValues as NonNullable<CustomTypes['outputPorts']>);
    };

    this.websocket.onclose = () => {
      this.dispatchEvent('close', undefined);
    };

    this.websocket.onmessage = ({ data }) => {
      try {
        const parsed = JSON.parse(data);

        try {
          if (parsed.config) {
            this.currentConfig = parsed.config;
            this.dispatchEvent('config', this.currentConfig);
          } else if (parsed.updates) {
            this.currentInputPortValues = { ...this.currentInputPortValues, ...parsed.updates };
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

  public close(): void {
    this.websocket.close();
  }

  public sendEvent<EventName extends keyof CustomTypes['outputEvent']>(
    eventName: EventName,
    ...[eventValue]: CustomTypes['outputEvent'][EventName] extends undefined ? [] : [CustomTypes['outputEvent'][EventName]]
  ): void {
    if (this.isConnected) {
      this.websocket.send(
        JSON.stringify({
          event: {
            key: eventName,
            value: eventValue,
          },
        })
      );
    }
  }

  public setOutputPortValues(values: Partial<CustomTypes['outputPorts']>): void {
    this.currentOutputPortValues = { ...this.currentOutputPortValues, ...values };
    if (this.isConnected) {
      this.websocket.send(JSON.stringify({ updates: values }));
    }
  }

  // Type-safe wrapper around EventTarget
  public addEventListener<
    EventName extends keyof ConnectionEventListeners<CustomTypes>,
    EventValue extends ConnectionEventListeners<CustomTypes>[EventName]
  >(type: EventName, listener: (ev: CustomEvent<EventValue>) => void, options?: boolean | AddEventListenerOptions): void {
    this.eventTarget.addEventListener(type, listener as EventListener, options);
  }
  public removeEventListener<
    EventName extends keyof ConnectionEventListeners<CustomTypes>,
    EventValue extends ConnectionEventListeners<CustomTypes>[EventName]
  >(type: EventName, listener: (ev: CustomEvent<EventValue>) => void, options?: boolean | EventListenerOptions): void {
    this.eventTarget.removeEventListener(type, listener as EventListener, options);
  }
  private dispatchEvent<EventName extends keyof ConnectionEventListeners<CustomTypes>>(
    type: EventName,
    detail: ConnectionEventListeners<CustomTypes>[EventName]
  ): void {
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
