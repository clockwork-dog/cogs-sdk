import {
  CogsValueType,
  CogsValueTypeBoolean,
  CogsValueTypeNumber,
  CogsValueTypeOption,
  CogsValueTypeString,
  PluginManifestJson,
  PluginManifestJsonReadonly,
  PluginManifestStateJson,
} from './PluginManifestJson';
import { DeepMutable } from './utils';

export type TypeFromCogsValueType<ValueType extends Pick<CogsValueType, 'type'> | undefined> = ValueType extends CogsValueTypeOption<string[]>
  ? ValueType['options'][number]
  : ValueType extends CogsValueTypeString
  ? Readonly<string>
  : ValueType extends CogsValueTypeNumber
  ? number
  : ValueType extends CogsValueTypeBoolean
  ? boolean
  : undefined;

/**
 * Allow readonly (i.e. `const`) versions of a manifest as well as a regular PluginManifestJson
 */
export type PluginManifest = PluginManifestJson | PluginManifestJsonReadonly;

export type ConfigKey<Manifest extends Pick<PluginManifest, 'config'>> = NonNullable<Manifest['config']>[number]['name'];

export type ConfigAsObject<Manifest extends Pick<PluginManifest, 'config'>> = {
  [Key in ConfigKey<Manifest>]: TypeFromCogsValueType<Extract<DeepMutable<NonNullable<Manifest['config']>[number]>, { name: Key }>['value']>;
};

export type StateKey<
  Manifest extends Pick<PluginManifest, 'state'>,
  Constraints extends Partial<PluginManifestStateJson> = Record<never, never>
> = Extract<DeepMutable<NonNullable<Manifest['state']>[number]>, Constraints>['name'];

export type StateAsObject<
  Manifest extends Pick<PluginManifest, 'state'>,
  Constraints extends Partial<PluginManifestStateJson> = Record<never, never>
> = {
  [Key in StateKey<Manifest, Constraints>]: TypeFromCogsValueType<
    Extract<DeepMutable<NonNullable<Manifest['state']>[number]>, { name: Key }>['value']
  >;
};

export type EventFromCogsKey<Manifest extends PluginManifest> = NonNullable<NonNullable<Manifest['events']>['fromCogs']>[number]['name'];

export type EventsFromCogs<Manifest extends PluginManifest> = NonNullable<NonNullable<Manifest['events']>['fromCogs']>[number];

export type EventFromCogsAsObject<Manifest extends PluginManifest> = {
  [Key in EventFromCogsKey<Manifest>]: TypeFromCogsValueType<Extract<DeepMutable<EventsFromCogs<Manifest>>, { name: Key }>['value']>;
};

export type EventToCogsKey<Manifest extends PluginManifest> = NonNullable<NonNullable<Manifest['events']>['toCogs']>[number]['name'];

export type EventsToCogs<Manifest extends PluginManifest> = NonNullable<NonNullable<Manifest['events']>['toCogs']>[number];

export type EventToCogsAsObject<Manifest extends PluginManifest> = {
  [Key in EventToCogsKey<Manifest>]: TypeFromCogsValueType<Extract<DeepMutable<EventsToCogs<Manifest>>, { name: Key }>['value']>;
};
