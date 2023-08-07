import {
  CogsValueType,
  CogsValueTypeBoolean,
  CogsValueTypeNumber,
  CogsValueTypeOption,
  CogsValueTypeString,
  CogsPluginManifest,
  PluginManifestStateJson,
} from './CogsPluginManifestJson';
import { DeepMutable, DistributeObject } from './utils';

export type TypeFromCogsValueType<ValueType extends Pick<CogsValueType, 'type'> | undefined> = ValueType extends CogsValueTypeOption<string[]>
  ? ValueType['options'][number]
  : ValueType extends CogsValueTypeString
  ? Readonly<string>
  : ValueType extends CogsValueTypeNumber
  ? number
  : ValueType extends CogsValueTypeBoolean
  ? boolean
  : undefined;

export type ConfigKey<Manifest extends Pick<CogsPluginManifest, 'config'>> = NonNullable<Manifest['config']>[number]['name'];

export type ConfigAsObject<Manifest extends Pick<CogsPluginManifest, 'config'>> = DistributeObject<
  {
    [Key in ConfigKey<Manifest>]: TypeFromCogsValueType<Extract<DeepMutable<NonNullable<Manifest['config']>[number]>, { name: Key }>['value']>;
  }
>;

export type StateKey<
  Manifest extends Pick<CogsPluginManifest, 'state'>,
  Constraints extends Partial<PluginManifestStateJson> = Record<never, never>
> = Extract<DeepMutable<NonNullable<Manifest['state']>[number]>, Constraints>['name'];

export type StateAsObject<
  Manifest extends Pick<CogsPluginManifest, 'state'>,
  Constraints extends Partial<PluginManifestStateJson> = Record<never, never>
> = DistributeObject<
  {
    [Key in StateKey<Manifest, Constraints>]: TypeFromCogsValueType<
      Extract<DeepMutable<NonNullable<Manifest['state']>[number]>, { name: Key }>['value']
    >;
  }
>;

export type EventFromCogsKey<Manifest extends CogsPluginManifest> = NonNullable<NonNullable<Manifest['events']>['fromCogs']>[number]['name'];

export type EventsFromCogs<Manifest extends CogsPluginManifest> = NonNullable<NonNullable<Manifest['events']>['fromCogs']>[number];

export type EventFromCogsAsObject<Manifest extends CogsPluginManifest> = DistributeObject<
  {
    [Key in EventFromCogsKey<Manifest>]: TypeFromCogsValueType<Extract<DeepMutable<EventsFromCogs<Manifest>>, { name: Key }>['value']>;
  }
>;

export type EventToCogsKey<Manifest extends CogsPluginManifest> = NonNullable<NonNullable<Manifest['events']>['toCogs']>[number]['name'];

export type EventsToCogs<Manifest extends CogsPluginManifest> = NonNullable<NonNullable<Manifest['events']>['toCogs']>[number];

export type EventToCogsAsObject<Manifest extends CogsPluginManifest> = DistributeObject<
  {
    [Key in EventToCogsKey<Manifest>]: TypeFromCogsValueType<Extract<DeepMutable<EventsToCogs<Manifest>>, { name: Key }>['value']>;
  }
>;
