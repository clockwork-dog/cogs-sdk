import {
  CogsValueType,
  CogsValueTypeBoolean,
  CogsValueTypeNumber,
  CogsValueTypeOption,
  CogsValueTypeString,
  PluginManifestJson,
  PluginManifestStateJson,
} from './PluginManifestJson';
import { DeepReadonly } from './utils';

export type TypeFromCogsValueType<ValueType extends DeepReadonly<CogsValueType> | undefined> = ValueType extends DeepReadonly<
  CogsValueTypeOption<string[]>
>
  ? ValueType['options'][number]
  : ValueType extends DeepReadonly<CogsValueTypeString>
  ? Readonly<string>
  : ValueType extends DeepReadonly<CogsValueTypeNumber>
  ? number
  : ValueType extends DeepReadonly<CogsValueTypeBoolean>
  ? boolean
  : undefined;

export type ConfigKey<Manifest extends DeepReadonly<Pick<PluginManifestJson, 'config'>>> = NonNullable<Manifest['config']>[number]['name'];

export type ConfigAsObject<Manifest extends DeepReadonly<Pick<PluginManifestJson, 'config'>>> = {
  [Key in ConfigKey<Manifest>]: TypeFromCogsValueType<Extract<NonNullable<Manifest['config']>[number], { name: Key }>['value']>;
};

export type StateKey<
  Manifest extends DeepReadonly<Pick<PluginManifestJson, 'state'>>,
  Constraints extends Partial<DeepReadonly<PluginManifestStateJson>> = Record<never, never>
> = Extract<NonNullable<Manifest['state']>[number], Constraints>['name'];

export type StateAsObject<
  Manifest extends DeepReadonly<Pick<PluginManifestJson, 'state'>>,
  Constraints extends Partial<DeepReadonly<PluginManifestStateJson>> = Record<never, never>
> = {
  [Key in StateKey<Manifest, Constraints>]: TypeFromCogsValueType<Extract<NonNullable<Manifest['state']>[number], { name: Key }>['value']>;
};

export type EventFromCogsKey<Manifest extends DeepReadonly<Pick<PluginManifestJson, 'events'>>> = NonNullable<
  NonNullable<Manifest['events']>['fromCogs']
>[number]['name'];

export type EventsFromCogs<Manifest extends DeepReadonly<Pick<PluginManifestJson, 'events'>>> = NonNullable<
  NonNullable<Manifest['events']>['fromCogs']
>[number];

export type EventFromCogsAsObject<Manifest extends DeepReadonly<Pick<PluginManifestJson, 'events'>>> = {
  [Key in EventFromCogsKey<Manifest>]: TypeFromCogsValueType<Extract<EventsFromCogs<Manifest>, { name: Key }>['value']>;
};

export type EventToCogsKey<Manifest extends DeepReadonly<Pick<PluginManifestJson, 'events'>>> = NonNullable<
  NonNullable<Manifest['events']>['toCogs']
>[number]['name'];

export type EventsToCogs<Manifest extends DeepReadonly<Pick<PluginManifestJson, 'events'>>> = NonNullable<
  NonNullable<Manifest['events']>['toCogs']
>[number];

export type EventToCogsAsObject<Manifest extends DeepReadonly<Pick<PluginManifestJson, 'events'>>> = {
  [Key in EventToCogsKey<Manifest>]: TypeFromCogsValueType<Extract<EventsToCogs<Manifest>, { name: Key }>['value']>;
};
