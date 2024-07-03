import { DeepReadonly } from './utils';

export type FontAwesomeIconId = string;

export interface CogsValueTypeBase<Id extends string> {
  type: Id;
}

export type CogsValueTypeString = CogsValueTypeBase<'string'>;
export interface CogsValueTypeNumber extends CogsValueTypeBase<'number'> {
  integer?: true;
  min?: number;
  max?: number;
}

export type CogsValueTypeBoolean = CogsValueTypeBase<'boolean'>;
export interface CogsValueTypeOption<Options extends string[]> extends CogsValueTypeBase<'option'> {
  options: Options;
}

export type CogsValueType = CogsValueTypeString | CogsValueTypeNumber | CogsValueTypeBoolean | CogsValueTypeOption<string[]>;

export type CogsValueTypeStringWithDefault = CogsValueTypeString & { default: string };
export type CogsValueTypeNumberWithDefault = CogsValueTypeNumber & { default: number };
export type CogsValueTypeBooleanWithDefault = CogsValueTypeBoolean & { default: boolean };
export type CogsValueTypeOptionWithDefault = CogsValueTypeOption<string[]> & { default: string };

export type CogsValueTypeWithDefault =
  | CogsValueTypeStringWithDefault
  | CogsValueTypeNumberWithDefault
  | CogsValueTypeBooleanWithDefault
  | CogsValueTypeOptionWithDefault;

export type PluginManifestConfigJson = {
  name: string;
  value: CogsValueType | CogsValueTypeWithDefault;
};

export type PluginManifestEventJson = {
  name: string;
  value?: CogsValueType;
};

export type PluginManifestStateJson = {
  name: string;
  value: CogsValueTypeWithDefault;
  writableFromCogs?: true;
  writableFromClient?: true;
};

/**
 * `cogs-plugin-manifest.json` is a JSON manifest file describing the content of a COGS plugin or COGS Media Master custom content.
 *
 *
 * It should be saved in the root of a folder in the `plugins` or `client_content` folder in your COGS project
 *
 * The [COGS plugins directory](/plugins) contains a number of plugins you can use out of the box
 */
export interface CogsPluginManifestJson {
  /**
   * e.g. `1.0.0`
   */
  version: `${number}` | `${number}.${number}` | `${number}.${number}.${number}`;

  /**
   * A short human-readable name
   */
  name: string;

  /**
   * The minimum COGS version required
   *
   * Follows semantic versioning with `semver`
   * e.g. `4.12.0
   */
  minCogsVersion?: `${number}.${number}.${number}`;

  /**
   * A description that appears alongside `name` in the list of plugins, and in the [COGS plugins directory](/plugins)
   */
  description?: string;

  /**
   * An icon shown alongside `name`, in the COGS navigation bar, and in the [COGS plugins directory](/plugins)
   *
   * The icon can be either:
   * - A FontAwesome 5 icon
   * - The relative path to an image in your plugin folder (Requires COGS 4.13 or later)
   *   - Must start with `./`
   *   - Alpha channel is used as a mask
   */
  icon?: string;

  /**
   * The HTML entrypoint for the plugin
   *
   * Defaults to `/` which includes `/index.html`
   */
  indexPath?: string;
  /**
   * If set, shows a popup window to the user where you can show the HTML content of your plugin
   *
   * By default a window is not shown to the user
   * The window can later be opened/closed from the Javascript running in the plugin
   * Only valid for plugins, not for Media Master custom content
   */
  window?: {
    width: number;
    height: number;

    /**
     * Whether the window is initially visible
     */
    visible?: boolean;
  };
  config?: PluginManifestConfigJson[];

  /**
   * Events that trigger COGS behaviors or can trigger actions in this plugin
   */
  events?: {
    fromCogs?: PluginManifestEventJson[];
    toCogs?: PluginManifestEventJson[];
  };

  /**
   * State that can be set by COGS behaviors
   */
  state?: PluginManifestStateJson[];

  /**
   * The types of COGS media actions supported
   */
  media?: {
    audio?: true;
    video?: true;
    images?: true;
  };

  /**
   * COGS-managed key/value data store settings
   *
   * Allows certain key/value pairs to be saved to disk in the project folder alongside the plugin.
   * Any key that is not listed here can still be used.
   */
  store?: {
    items?: {
      [key: string]: {
        /**
         * When `true` saves this key/value pair to the project folder when the value changes
         * and restores the value when the project is next loaded.
         *
         * **This option is only available for COGS plugins**, not for custom Media Master content.
         */
        persistValue?: boolean;
      };
    };
  };
}

/**
 * A readonly version of `PluginManifestJson`
 * to help editors and IDEs provide autocomplete and type checking
 * with `@type {const}` enabled
 */
export type CogsPluginManifestJsonReadonly = DeepReadonly<CogsPluginManifestJson>;

/**
 * Allow readonly (i.e. `const`) versions of a manifest as well as a regular PluginManifestJson
 */
export type CogsPluginManifest = CogsPluginManifestJson | CogsPluginManifestJsonReadonly;
