import { describe, expect, it } from 'vitest';

import { matchesNetworkHostPattern } from './matchesNetworkHostPattern';

describe('matchesNetworkHostPattern()', () => {
  it('throws for a pattern with no port', () => {
    expect(() => matchesNetworkHostPattern('vendor.com', 'vendor.com', 443)).toThrow();
  });

  it('throws for a pattern with a trailing colon and no port', () => {
    expect(() => matchesNetworkHostPattern('vendor.com:', 'vendor.com', 443)).toThrow();
  });

  it('matches an exact host and port', () => {
    expect(matchesNetworkHostPattern('api.vendor.com:443', 'api.vendor.com', 443)).toBe(true);
  });

  it('does not match a different host', () => {
    expect(matchesNetworkHostPattern('api.vendor.com:443', 'other.vendor.com', 443)).toBe(false);
  });

  it('does not match a different port', () => {
    expect(matchesNetworkHostPattern('api.vendor.com:443', 'api.vendor.com', 8443)).toBe(false);
  });

  it('matches a hostname case-insensitively', () => {
    expect(matchesNetworkHostPattern('API.Vendor.com:443', 'api.vendor.com', 443)).toBe(true);
  });

  describe('wildcard patterns', () => {
    it('matches any port with a `:*` pattern', () => {
      expect(matchesNetworkHostPattern('foo.example.com:*', 'foo.example.com', 8080)).toBe(true);
      expect(matchesNetworkHostPattern('foo.example.com:*', 'foo.example.com', 443)).toBe(true);
    });

    it('matches any host and any port with `*:*`', () => {
      expect(matchesNetworkHostPattern('*:*', 'anything.example.com', 1234)).toBe(true);
      expect(matchesNetworkHostPattern('*:*', '203.0.113.5', 22)).toBe(true);
    });

    it('matches subdomains with a wildcard subdomain pattern', () => {
      expect(matchesNetworkHostPattern('*.vendor.com:443', 'api.vendor.com', 443)).toBe(true);
      expect(matchesNetworkHostPattern('*.vendor.com:443', 'a.b.vendor.com', 443)).toBe(true);
    });

    it('does not match the bare domain with a wildcard subdomain pattern', () => {
      expect(matchesNetworkHostPattern('*.vendor.com:443', 'vendor.com', 443)).toBe(false);
    });

    it('does not match an unrelated domain with a wildcard subdomain pattern', () => {
      expect(matchesNetworkHostPattern('*.vendor.com:443', 'api.notvendor.com', 443)).toBe(false);
    });
  });

  describe('localhost', () => {
    it('matches localhost, 127.0.0.1 and ::1 with a `localhost` pattern', () => {
      expect(matchesNetworkHostPattern('localhost:8080', 'localhost', 8080)).toBe(true);
      expect(matchesNetworkHostPattern('localhost:8080', '127.0.0.1', 8080)).toBe(true);
      expect(matchesNetworkHostPattern('localhost:8080', '::1', 8080)).toBe(true);
    });

    it('does not match other hosts with a `localhost` pattern', () => {
      expect(matchesNetworkHostPattern('localhost:8080', 'example.com', 8080)).toBe(false);
    });

    it('matches the IPv6 loopback in bracket format', () => {
      expect(matchesNetworkHostPattern('localhost:8080', '[::1]', 8080)).toBe(true);
    });
  });

  describe('private IP ranges', () => {
    it('matches RFC 1918 private IP ranges with a `private` pattern', () => {
      expect(matchesNetworkHostPattern('private:443', '10.0.0.1', 443)).toBe(true);
      expect(matchesNetworkHostPattern('private:443', '172.16.0.1', 443)).toBe(true);
      expect(matchesNetworkHostPattern('private:443', '172.31.255.255', 443)).toBe(true);
      expect(matchesNetworkHostPattern('private:443', '192.168.1.1', 443)).toBe(true);
    });

    it('does not match public IPs with a `private` pattern', () => {
      expect(matchesNetworkHostPattern('private:443', '8.8.8.8', 443)).toBe(false);
      expect(matchesNetworkHostPattern('private:443', '172.15.255.255', 443)).toBe(false);
      expect(matchesNetworkHostPattern('private:443', '172.32.0.0', 443)).toBe(false);
    });

    it('does not match hostnames with a `private` pattern', () => {
      expect(matchesNetworkHostPattern('private:443', 'vendor.com', 443)).toBe(false);
    });

    it('does not match an out-of-range octet with a `private` pattern', () => {
      expect(matchesNetworkHostPattern('private:443', '10.999.999.999', 443)).toBe(false);
    });
  });

  describe('IPv6 patterns', () => {
    it('matches an exact IPv6 literal using bracket syntax', () => {
      expect(matchesNetworkHostPattern('[fd00::1]:443', '[fd00::1]', 443)).toBe(true);
    });

    it('does not match a different IPv6 literal', () => {
      expect(matchesNetworkHostPattern('[fd00::1]:443', '[fd00::2]', 443)).toBe(false);
    });
  });
});
