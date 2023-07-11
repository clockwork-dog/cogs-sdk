import {
  CogsValueType,
  CogsValueTypeBoolean,
  CogsValueTypeNumber,
  CogsValueTypeOption,
  CogsValueTypeString,
  PluginManifestJson,
  PluginManifestStateJson,
} from './PluginManifestJson';
import { DeepMutable, DeepReadonly } from './utils';

export type TypeFromCogsValueType<ValueType extends Pick<CogsValueType, 'type'> | undefined> = ValueType extends CogsValueTypeOption<string[]>
  ? ValueType['options'][number]
  : ValueType extends CogsValueTypeString
  ? Readonly<string>
  : ValueType extends CogsValueTypeNumber
  ? number
  : ValueType extends CogsValueTypeBoolean
  ? boolean
  : undefined;

export type ConfigKey<Manifest extends DeepReadonly<Pick<PluginManifestJson, 'config'>>> = NonNullable<Manifest['config']>[number]['name'];

export type ConfigAsObject<Manifest extends DeepReadonly<Pick<PluginManifestJson, 'config'>>> = {
  [Key in ConfigKey<Manifest>]: TypeFromCogsValueType<Extract<DeepMutable<NonNullable<Manifest['config']>[number]>, { name: Key }>['value']>;
};

export type StateKey<
  Manifest extends DeepReadonly<Pick<PluginManifestJson, 'state'>>,
  Constraints extends Partial<DeepReadonly<PluginManifestStateJson>> = Record<never, never>
> = Extract<DeepMutable<NonNullable<Manifest['state']>[number]>, Constraints>['name'];

export type StateAsObject<
  Manifest extends DeepReadonly<Pick<PluginManifestJson, 'state'>>,
  Constraints extends Partial<DeepReadonly<PluginManifestStateJson>> = Record<never, never>
> = {
  [Key in StateKey<Manifest, Constraints>]: TypeFromCogsValueType<
    Extract<DeepMutable<NonNullable<Manifest['state']>[number]>, { name: Key }>['value']
  >;
};

export type EventFromCogsKey<Manifest extends DeepReadonly<Pick<PluginManifestJson, 'events'>>> = NonNullable<
  NonNullable<Manifest['events']>['fromCogs']
>[number]['name'];

export type EventsFromCogs<Manifest extends DeepReadonly<Pick<PluginManifestJson, 'events'>>> = NonNullable<
  NonNullable<Manifest['events']>['fromCogs']
>[number];

export type EventFromCogsAsObject<Manifest extends DeepReadonly<Pick<PluginManifestJson, 'events'>>> = {
  [Key in EventFromCogsKey<Manifest>]: TypeFromCogsValueType<Extract<DeepMutable<EventsFromCogs<Manifest>>, { name: Key }>['value']>;
};

export type EventToCogsKey<Manifest extends DeepReadonly<Pick<PluginManifestJson, 'events'>>> = NonNullable<
  NonNullable<Manifest['events']>['toCogs']
>[number]['name'];

export type EventsToCogs<Manifest extends DeepReadonly<Pick<PluginManifestJson, 'events'>>> = NonNullable<
  NonNullable<Manifest['events']>['toCogs']
>[number];

export type EventToCogsAsObject<Manifest extends DeepReadonly<Pick<PluginManifestJson, 'events'>>> = {
  [Key in EventToCogsKey<Manifest>]: TypeFromCogsValueType<Extract<DeepMutable<EventsToCogs<Manifest>>, { name: Key }>['value']>;
};
