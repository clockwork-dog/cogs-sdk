import { describe, expect, it } from 'vitest';

import { NetworkHostPattern } from './NetworkHostPattern';

describe('NetworkHostPattern', () => {
  describe('exact host and port', () => {
    const exactHostAndPortPattern = new NetworkHostPattern('api.vendor.com:443');

    it('throws for a pattern with no port', () => {
      const pattern = () => new NetworkHostPattern('vendor.com');

      expect(pattern).toThrow();
    });

    it('throws for a pattern with a trailing colon and no port', () => {
      const pattern = () => new NetworkHostPattern('vendor.com:');

      expect(pattern).toThrow();
    });

    it('matches an exact host and port', () => {
      expect(exactHostAndPortPattern.validate('api.vendor.com', 443)).toBe(true);
    });

    it('does not match a different host', () => {
      expect(exactHostAndPortPattern.validate('other.vendor.com', 443)).toBe(false);
    });

    it('does not match a different port', () => {
      expect(exactHostAndPortPattern.validate('api.vendor.com', 8443)).toBe(false);
    });
  });

  it('matches a hostname case-insensitively', () => {
    const subdomainPattern = new NetworkHostPattern('API.Vendor.com:443');

    expect(subdomainPattern.validate('api.vendor.com', 443)).toBe(true);
  });

  describe('wildcard patterns', () => {
    const wildcardSubdomainPattern = new NetworkHostPattern('*.vendor.com:443');

    it('matches any port with a `:*` pattern', () => {
      const pattern = new NetworkHostPattern('foo.example.com:*');

      expect(pattern.validate('foo.example.com', 8080)).toBe(true);
      expect(pattern.validate('foo.example.com', 443)).toBe(true);
    });

    it('matches any host and any port with `*:*`', () => {
      const pattern = new NetworkHostPattern('*:*');

      expect(pattern.validate('anything.example.com', 1234)).toBe(true);
      expect(pattern.validate('203.0.113.5', 22)).toBe(true);
    });

    it('matches subdomains with a wildcard subdomain pattern', () => {
      expect(wildcardSubdomainPattern.validate('api.vendor.com', 443)).toBe(true);
      expect(wildcardSubdomainPattern.validate('a.b.vendor.com', 443)).toBe(true);
    });

    it('does not match the bare domain with a wildcard subdomain pattern', () => {
      expect(wildcardSubdomainPattern.validate('vendor.com', 443)).toBe(false);
    });

    it('does not match an unrelated domain with a wildcard subdomain pattern', () => {
      expect(wildcardSubdomainPattern.validate('api.notvendor.com', 443)).toBe(false);
    });
  });

  describe('localhost', () => {
    const localhostPattern = new NetworkHostPattern('localhost:8080');

    it('matches localhost, 127.0.0.1 and ::1 with a `localhost` pattern', () => {
      expect(localhostPattern.validate('localhost', 8080)).toBe(true);
      expect(localhostPattern.validate('127.0.0.1', 8080)).toBe(true);
      expect(localhostPattern.validate('::1', 8080)).toBe(true);
    });

    it('does not match other hosts with a `localhost` pattern', () => {
      expect(localhostPattern.validate('example.com', 8080)).toBe(false);
    });

    it('matches the IPv6 loopback in bracket format', () => {
      expect(localhostPattern.validate('[::1]', 8080)).toBe(true);
    });
  });

  describe('private IP ranges', () => {
    const privatePattern = new NetworkHostPattern('private:443');

    it('matches RFC 1918 private IP ranges with a `private` pattern', () => {
      expect(privatePattern.validate('10.0.0.1', 443)).toBe(true);
      expect(privatePattern.validate('172.16.0.1', 443)).toBe(true);
      expect(privatePattern.validate('172.31.255.255', 443)).toBe(true);
      expect(privatePattern.validate('192.168.1.1', 443)).toBe(true);
    });

    it('does not match public IPs with a `private` pattern', () => {
      expect(privatePattern.validate('8.8.8.8', 443)).toBe(false);
      expect(privatePattern.validate('172.15.255.255', 443)).toBe(false);
      expect(privatePattern.validate('172.32.0.0', 443)).toBe(false);
    });

    it('does not match hostnames with a `private` pattern', () => {
      expect(privatePattern.validate('vendor.com', 443)).toBe(false);
    });

    it('does not match an out-of-range octet with a `private` pattern', () => {
      expect(privatePattern.validate('10.999.999.999', 443)).toBe(false);
    });
  });

  describe('validateHostname', () => {
    it('matches a host regardless of port', () => {
      const pattern = new NetworkHostPattern('*.vendor.com:443');

      expect(pattern.validateHostname('api.vendor.com')).toBe(true);
    });

    it('does not match an unrelated host', () => {
      const pattern = new NetworkHostPattern('*.vendor.com:443');

      expect(pattern.validateHostname('vendor.com')).toBe(false);
    });
  });

  describe('IPv6 patterns', () => {
    const exactIpv6Pattern = new NetworkHostPattern('[fd00::1]:443');

    it('matches an exact IPv6 literal using bracket syntax', () => {
      expect(exactIpv6Pattern.validate('[fd00::1]', 443)).toBe(true);
    });

    it('does not match a different IPv6 literal', () => {
      expect(exactIpv6Pattern.validate('[fd00::2]', 443)).toBe(false);
    });
  });
});
