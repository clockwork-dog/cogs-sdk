import { ConfigValue, EventKeyValue, EventValue, StateValue, ShowPhase } from './types/valueTypes';
import ReconnectingWebSocket from 'reconnecting-websocket';
import CogsClientMessage from './types/CogsClientMessage';
import { COGS_SERVER_PORT } from './helpers/urls';
import MediaClipStateMessage from './types/MediaClipStateMessage';
import AllMediaClipStatesMessage from './types/AllMediaClipStatesMessage';
import { PluginManifestJson } from './types/PluginManifestJson';
import ManifestTypes from './types/ManifestTypes';

interface ConnectionEventListeners<
  // TODO: convert to manifest generic type
  CustomTypes extends {
    config?: { [configKey: string]: ConfigValue };
    inputPorts?: { [port: string]: StateValue };
    inputEvents?: { [key: string]: EventValue | null };
  }
> {
  open: undefined;
  close: undefined;
  message: CogsClientMessage;
  config: CustomTypes['config'];
  updates: Partial<CustomTypes['state']>; // TODO: rename to "state"
  event: CustomTypes['inputEvents'] extends { [key: string]: EventValue | null } ? EventKeyValue<CustomTypes['inputEvents']> : Record<string, never>;
}

export type TimerState = Omit<Extract<CogsClientMessage, { type: 'adjustable_timer_update' }>, 'type'> & { startedAt: number };

// TODO: remove this
type CustomTypes = {
  config?: { [configKey: string]: ConfigValue };
  state?: { [stateKey: string]: StateValue };
  inputEvents?: { [key: string]: EventValue | null };
  outputEvents?: { [key: string]: EventValue | null };
};

export default class CogsConnection<
  Manifest extends DeepReadonly<PluginManifestJson> // `DeepReadonly` allows passing `as const` literal
> {
  private websocket: WebSocket | ReconnectingWebSocket;
  private eventTarget = new EventTarget();

  private currentConfig: ManifestTypes.ConfigAsObject<Manifest> = {} as ManifestTypes.ConfigAsObject<Manifest>; // Received on open connection
  public get config(): ManifestTypes.ConfigAsObject<Manifest> {
    return { ...this.currentConfig };
  }

  private currentState: ManifestTypes.StateAsObject<Manifest> = {} as ManifestTypes.StateAsObject<Manifest>; // Received on open connection - TODO: set initial state from manifest?
  public get state(): ManifestTypes.StateAsObject<Manifest> {
    return { ...this.currentState };
  }

  private _showPhase: ShowPhase = ShowPhase.Setup;
  public get showPhase(): ShowPhase {
    return this._showPhase;
  }

  private _timerState: TimerState | null = null;
  public get timerState(): TimerState | null {
    return this._timerState ? { ...this._timerState } : null;
  }

  /**
   * Cached audio outputs use to look up the device/sink ID when a different device label is requested
   */
  private audioOutputs: MediaDeviceInfo[] | undefined = undefined;

  private _selectedAudioOutput = '';
  public get selectedAudioOutput(): string {
    return this._selectedAudioOutput;
  }

  constructor(
    readonly manifest: Manifest,
    { hostname = document.location.hostname, port = COGS_SERVER_PORT }: { hostname?: string; port?: number } = {},
    initialClientState: Partial<ManifestTypes.StateAsObject<Manifest, { writableFromClient: true }>> | undefined = undefined
  ) {
    this.currentState = { ...(initialClientState as ManifestTypes.StateAsObject<Manifest, { writableFromClient: true }>) };
    const { useReconnectingWebsocket, path, pathParams } = websocketParametersFromUrl(document.location.href);
    const socketUrl = `ws://${hostname}:${port}${path}${pathParams ? '?' + pathParams : ''}`;
    this.websocket = useReconnectingWebsocket ? new ReconnectingWebSocket(socketUrl) : new WebSocket(socketUrl);

    this.websocket.onopen = () => {
      this.currentConfig = {} as ManifestTypes.ConfigAsObject<Manifest>; // Received on open connection
      this.currentState = {} as ManifestTypes.StateAsObject<Manifest>; // Received on open connection

      this.dispatchEvent('open', undefined);
      this.setState(this.currentState); // TODO: Remove this because you should set it manually...??
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
            this.currentState = { ...this.currentState, ...parsed.updates };
            this.dispatchEvent('updates', parsed.updates);
          } else if (parsed.event && parsed.event.key) {
            this.dispatchEvent('event', parsed.event);
          } else if (typeof parsed.message === 'object') {
            switch (parsed.message.type) {
              case 'adjustable_timer_update':
                this._timerState = {
                  startedAt: Date.now(),
                  durationMillis: parsed.message.durationMillis,
                  ticking: parsed.message.ticking,
                };
                break;
              case 'show_phase':
                this._showPhase = parsed.message.phase;
                break;
            }

            this.dispatchEvent('message', parsed.message);
          }
        } catch (e) {
          console.warn('Error handling data', data, e);
        }
      } catch (e) {
        console.error('Unable to parse incoming data from server', data, e);
      }
    };

    // Send a list of audio outputs to COGS and keep it up to date
    {
      const refreshAudioOutputs = async () => {
        // `navigator.mediaDevices` is undefined on COGS AV <= 4.5 because of secure origin permissions
        if (navigator.mediaDevices) {
          const audioOutputs = (await navigator.mediaDevices.enumerateDevices()).filter(({ kind }) => kind === 'audiooutput');
          this.sendAudioOutputs(audioOutputs);
          this.audioOutputs = audioOutputs;
        }
      };

      this.addEventListener('open', refreshAudioOutputs);
      navigator.mediaDevices?.addEventListener('devicechange', refreshAudioOutputs);
      refreshAudioOutputs();
    }
  }

  public get isConnected(): boolean {
    return this.websocket.readyState === WebSocket.OPEN;
  }

  public close(): void {
    this.websocket.close();
  }

  public sendEvent<EventName extends ManifestTypes.EventFromCogsKey<Manifest>>(
    eventName: EventName,
    ...[eventValue]: ManifestTypes.EventFromCogsAsObject<Manifest>[EventName] extends undefined
      ? []
      : [ManifestTypes.EventFromCogsAsObject<Manifest>[EventName]]
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

  public setState(values: Partial<ManifestTypes.StateAsObject<Manifest, { writableFromClient: true }>>): void {
    this.currentState = { ...this.currentState, ...values };
    if (this.isConnected) {
      this.websocket.send(JSON.stringify({ updates: values }));
    }
  }

  public getAudioSinkId(audioOutput: string): string | undefined {
    return audioOutput ? this.audioOutputs?.find(({ label }) => label === audioOutput)?.deviceId : '';
  }

  sendInitialMediaClipStates(allMediaClipStates: AllMediaClipStatesMessage): void {
    if (this.isConnected) {
      this.websocket.send(JSON.stringify({ allMediaClipStates }));
    }
  }

  sendMediaClipState(mediaClipState: MediaClipStateMessage): void {
    if (this.isConnected) {
      this.websocket.send(JSON.stringify({ mediaClipState }));
    }
  }

  sendAudioOutputs(audioOutputs: MediaDeviceInfo[]): void {
    if (this.isConnected) {
      this.websocket.send(JSON.stringify({ audioOutputs }));
    }
  }

  /**
   * Show or hide the plugin window.
   * @param visible Whether to show or hide the window
   * This is only relevant for plugins, not for Media Master content.
   */
  public setPluginWindowVisible(visible: boolean): void {
    if (this.isConnected) {
      this.websocket.send(JSON.stringify({ window: { visible } }));
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

function websocketParametersFromUrl(url: string): { path: string; pathParams?: URLSearchParams; useReconnectingWebsocket?: boolean } {
  const parsedUrl = new URL(url);
  const pathParams = new URLSearchParams(parsedUrl.searchParams);
  const localClientId = pathParams.get('local_id');
  const isSimulator = pathParams.get('simulator') === 'true';
  const display = pathParams.get('display') ?? '';
  const pluginId = parsedUrl.pathname.startsWith('/plugin/') ? decodeURIComponent(parsedUrl.pathname.split('/')[2]) : undefined;

  if (localClientId) {
    const type = pathParams.get('t') ?? '';
    pathParams.delete('local_id');
    return {
      path: `/local/${encodeURIComponent(localClientId)}`,
      pathParams: new URLSearchParams({ t: type }),
      useReconnectingWebsocket: true,
    };
  } else if (isSimulator) {
    const name = pathParams.get('name') ?? '';
    pathParams.delete('simulator');
    pathParams.delete('name');
    return { path: `/simulator/${encodeURIComponent(name)}`, pathParams, useReconnectingWebsocket: true };
  } else if (display) {
    const displayIdIndex = pathParams.get('displayIdIndex') ?? '';
    pathParams.delete('display');
    pathParams.delete('displayIdIndex');
    return { path: `/display/${encodeURIComponent(display)}/${encodeURIComponent(displayIdIndex)}` };
  } else if (pluginId) {
    return { path: `/plugin/${encodeURIComponent(pluginId)}`, useReconnectingWebsocket: true };
  } else {
    const serial = pathParams.get('serial') ?? '';
    pathParams.delete('serial');
    return { path: `/client/${encodeURIComponent(serial)}`, pathParams };
  }
}

import manifest from './cogs-plugin-manifest.js';
import { DeepReadonly } from './types/utils';
const connection = new CogsConnection(manifest);
//
//
connection.config.Bar;
connection.state.Count;
connection.setState({});
connection.sendEvent('Here is a number', 746);
