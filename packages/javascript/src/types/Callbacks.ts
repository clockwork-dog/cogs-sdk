import CogsClientMessage from './CogsClientMessage';

export type UpdateValue = string | number | boolean;
export type ConfigValue = string | number | boolean;
export type EventValue = string | number | boolean;

export default interface Callbacks {
  onSocketOpen?: () => void;
  onSocketClose?: () => void;
  onUpdates?: (updates: { [port: string]: UpdateValue }) => void;
  onEvent?: (eventKey: string, eventValue?: EventValue) => void;
  onConfig?: (config: { [configKey: string]: ConfigValue }) => void;
  onMessage?: (message: CogsClientMessage) => void;
}
