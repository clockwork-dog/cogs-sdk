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

export type PluginManifestNetworkAccessRuleJson = {
  /**
   * Host patterns this rule grants outbound network access to.
   *
   * Every pattern must include an explicit port.
   *
   * | Pattern | Meaning |
   * | --- | --- |
   * | `"localhost:8080"` | Port 8080 on `localhost` / `127.0.0.1` / `::1` |
   * | `"private:443"` | Port 443 on any RFC 1918 private address range (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) |
   * | `"api.vendor.com:443"` | An exact hostname and port |
   * | `"*.vendor.com:443"` | A wildcard subdomain, exact port |
   * | `"foo.example.com:*"` | Any port on an exact hostname |
   * | `"[fd00::1]:443"` | An IPv6 literal, using bracket syntax |
   * | `"*:*"` | Any host, any port |
   *
   * CIDR ranges (e.g. `"192.168.1.0/24:443"`) are not supported.
   *
   * Every port on `localhost` / `127.0.0.1` / `::1` is always implicitly reachable regardless of
   * these rules, since plugins connect to the COGS server at `localhost:12095` — a `"localhost:*"`
   * pattern here is never required.
   */
  hosts: string[];

  /**
   * Paths, relative to the root of the packaged `.cogsplugin` archive, of PEM-encoded CA
   * certificates to trust for HTTPS connections to the hosts matched by `hosts`.
   *
   * Use this to reach local devices with vendor-issued certificates that aren't in the system CA
   * store (e.g. a Philips Hue bridge). For matched hosts, the certificate chain is verified
   * against these CAs instead of the system store; all other hosts continue to use the system
   * store.
   */
  caCertificates?: string[];
};

/**
 * `cogs-plugin-manifest.json` is a JSON manifest file describing the content of a COGS plugin or COGS Media Master custom content.
 *
 *
 * It should be saved in the root of a folder in the `plugins` or `client_content` folder in your COGS project
 *
 * The [COGS plugins directory](https://docs.cogs.show/plugins/) contains a number of plugins you can use out of the box
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
   * Added in COGS 5.4
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

  /**
   * Elevated permissions for this plugin.
   *
   * **Only applies to verified, packaged (`.cogsplugin`) plugins.** It is ignored for plugins
   * loaded from a folder, to maintain compatibility with the existing folder-based plugin
   * structure.
   */
  permissions?: {
    network?: {
      /**
       * Rules granting this plugin outbound network access to specific hosts, optionally with
       * a bundled CA certificate for hosts using vendor-issued (rather than publicly-trusted)
       * TLS certificates.
       *
       * Requests to hosts not matched by any rule here are blocked. By default a plugin has no
       * network access beyond the COGS server itself.
       *
       * Added in COGS 5.11.0
       */
      access?: PluginManifestNetworkAccessRuleJson[];
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
