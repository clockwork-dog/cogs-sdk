import { Address4, Address6 } from 'ip-address';

/**
 * A single host pattern from a `PluginManifestNetworkAccessRuleJson`'s `hosts` array
 * (e.g. `"private:443"`, `"*.vendor.com:443"`).
 */
export class NetworkHostPattern {
  private readonly host: string;
  private readonly port: string;

  /**
   * @throws If `pattern` has no port (or `*`) component.
   */
  constructor(pattern: string) {
    // Split on the last `:` rather than the first, since a bracketed IPv6 host (e.g. "[fd00::1]")
    // contains colons of its own.
    const lastColonIndex = pattern.lastIndexOf(':');
    const host = pattern.slice(0, lastColonIndex);
    const port = pattern.slice(lastColonIndex + 1);

    if (lastColonIndex === -1 || !/^(\d+|\*)$/.test(port)) {
      throw new Error(`Invalid host pattern "${pattern}": a port (or "*") is required`);
    }

    this.host = host;
    this.port = port;
  }

  /** Checks whether `host` and `port` are matched by this pattern. */
  validate(host: string, port: number): boolean {
    return this.matchesHost(host) && (this.port === '*' || Number(this.port) === port);
  }

  private matchesHost(host: string): boolean {
    // Hostnames are case-insensitive; IP literals are unaffected by lowercasing.
    const patternHost = this.host.toLowerCase();
    host = host.toLowerCase();

    if (patternHost === '*') {
      return true;
    }
    if (patternHost === 'localhost') {
      return host === 'localhost' || isLoopback(host);
    }
    if (patternHost === 'private') {
      return isPrivateIpv4(host);
    }
    if (patternHost.startsWith('*.')) {
      // The leading dot in the suffix guarantees a full-label boundary, so "*.vendor.com"
      // matches "api.vendor.com" but not "vendor.com".
      return host.endsWith(patternHost.slice(1));
    }
    return patternHost === host;
  }
}

/**
 * RFC 1918 private address ranges: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`.
 */
function isPrivateIpv4(host: string): boolean {
  return Address4.isValid(host) && new Address4(host).isPrivate();
}

/**
 * Loopback ranges: `127.0.0.0/8` (RFC 5735) and `::1` (RFC 4291).
 */
function isLoopback(host: string): boolean {
  // Only IPv6 literals are ever bracketed (e.g. "[::1]"); `Address6` doesn't accept the brackets itself.
  if (host.startsWith('[') && host.endsWith(']')) {
    const address = host.slice(1, -1);
    return Address6.isValid(address) && new Address6(address).isLoopback();
  }

  return (Address4.isValid(host) && new Address4(host).isLoopback()) || (Address6.isValid(host) && new Address6(host).isLoopback());
}
