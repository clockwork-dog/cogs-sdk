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

const IPV4_OCTET = '(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const IPV4_PATTERN = new RegExp(`^${IPV4_OCTET}\\.${IPV4_OCTET}\\.${IPV4_OCTET}\\.${IPV4_OCTET}$`);

/**
 * RFC 1918 private address ranges: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`.
 */
function isPrivateIpv4(host: string): boolean {
  const match = IPV4_PATTERN.exec(host);
  if (!match) {
    return false;
  }

  const [a, b] = match.slice(1).map(Number);

  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}
