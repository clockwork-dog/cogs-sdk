import { Address4 } from 'ip-address';

/**
 * Checks whether `host` and `port` are matched by a single host pattern from a
 * `PluginManifestNetworkAccessRuleJson`'s `hosts` array (e.g. `"private:443"`, `"*.vendor.com:443"`).
 *
 * @throws If `pattern` has no port (or `*`) component.
 */
export function matchesNetworkHostPattern(pattern: string, host: string, port: number): boolean {
  // Split on the last `:` rather than the first, since a bracketed IPv6 host (e.g. "[fd00::1]")
  // contains colons of its own.
  const lastColonIndex = pattern.lastIndexOf(':');
  const patternHost = pattern.slice(0, lastColonIndex);
  const patternPort = pattern.slice(lastColonIndex + 1);

  if (lastColonIndex === -1 || !/^(\d+|\*)$/.test(patternPort)) {
    throw new Error(`Invalid host pattern "${pattern}": a port (or "*") is required`);
  }

  return matchesHost(patternHost, host) && (patternPort === '*' || Number(patternPort) === port);
}

const LOCALHOST_HOSTS = ['localhost', '127.0.0.1', '::1', '[::1]'];

function matchesHost(patternHost: string, host: string): boolean {
  // Hostnames are case-insensitive; IP literals are unaffected by lowercasing.
  patternHost = patternHost.toLowerCase();
  host = host.toLowerCase();

  if (patternHost === '*') {
    return true;
  }
  if (patternHost === 'localhost') {
    return LOCALHOST_HOSTS.includes(host);
  }
  if (patternHost === 'private') {
    return isPrivateIpv4(host);
  }
  if (patternHost.startsWith('*.')) {
    // The leading dot in the suffix guarantees a full-label boundary, so "*.vendor.com"
    // matches "api.vendor.com" but not "notvendor.com" or "vendor.com" itself.
    return host.endsWith(patternHost.slice(1));
  }
  return patternHost === host;
}

/**
 * RFC 1918 private address ranges: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`.
 */
function isPrivateIpv4(host: string): boolean {
  return Address4.isValid(host) && new Address4(host).isPrivate();
}
