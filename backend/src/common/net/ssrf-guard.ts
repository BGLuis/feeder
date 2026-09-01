import { promises as dns } from 'node:dns';
import { isIP } from 'node:net';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * SSRF protection for user-supplied URLs (feed sources and outbound webhooks).
 *
 * Two layers:
 *  - `SafeUrlConstraint` / `@IsSafeUrl()` — synchronous DTO-time check: only
 *    http/https, and reject URLs whose host is a literal address in a private /
 *    loopback / link-local range.
 *  - `assertUrlAllowed()` — authoritative runtime check performed immediately
 *    before each fetch and re-run for every redirect hop: resolves DNS and
 *    rejects if ANY resolved address falls in a blocked range.
 *
 * `SSRF_ALLOWED_HOSTS` (CSV) lets dev/self-host setups whitelist hostnames such
 * as `localhost` or the docker service name `mysql`.
 */

export class SsrfBlockedError extends Error {
  constructor(reason: string) {
    super(`URL rejected by SSRF guard: ${reason}`);
    this.name = 'SsrfBlockedError';
  }
}

const MAX_REDIRECTS = 5;

function ipv4ToInt(ip: string): number {
  const parts = ip.split('.').map((p) => Number(p));
  return (
    ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
  );
}

function isBlockedIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  const inRange = (base: string, maskBits: number) => {
    const mask = maskBits === 0 ? 0 : (0xffffffff << (32 - maskBits)) >>> 0;
    return (n & mask) === (ipv4ToInt(base) & mask);
  };
  return (
    inRange('0.0.0.0', 8) || // "this" network / unspecified
    inRange('10.0.0.0', 8) || // RFC1918
    inRange('100.64.0.0', 10) || // CGNAT
    inRange('127.0.0.0', 8) || // loopback
    inRange('169.254.0.0', 16) || // link-local (incl. cloud metadata 169.254.169.254)
    inRange('172.16.0.0', 12) || // RFC1918
    inRange('192.0.0.0', 24) || // IETF protocol assignments
    inRange('192.168.0.0', 16) || // RFC1918
    inRange('198.18.0.0', 15) || // benchmarking
    inRange('224.0.0.0', 4) || // multicast
    inRange('240.0.0.0', 4) // reserved
  );
}

function normalizeIpv6(ip: string): string {
  return ip
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .split('%')[0];
}

function isBlockedIpv6(raw: string): boolean {
  const ip = normalizeIpv6(raw);
  if (ip === '::1' || ip === '::' || ip === '0:0:0:0:0:0:0:1') return true;
  if (
    ip.startsWith('fe80') ||
    ip.startsWith('fe9') ||
    ip.startsWith('fea') ||
    ip.startsWith('feb')
  ) {
    return true; // link-local fe80::/10
  }
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true; // unique local fc00::/7
  if (ip.startsWith('ff')) return true; // multicast
  // IPv4-mapped (::ffff:a.b.c.d)
  const mapped = ip.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIpv4(mapped[1]);
  return false;
}

export function isBlockedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isBlockedIpv4(ip);
  if (version === 6) return isBlockedIpv6(ip);
  return true; // not a parseable IP -> treat as unsafe
}

function parseAllowedHosts(csv: string | undefined): Set<string> {
  return new Set(
    (csv ?? '')
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Synchronous shape check used both by the DTO constraint and by the runtime guard. */
export function isSyntacticallySafeUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost')) return false;
  if (isIP(host) && isBlockedIp(host)) return false;
  return true;
}

/**
 * Resolve the URL's host and throw `SsrfBlockedError` if it points at a
 * disallowed address. Returns the parsed URL on success.
 */
export async function assertUrlAllowed(
  raw: string,
  allowedHostsCsv?: string,
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SsrfBlockedError('not a valid URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SsrfBlockedError(`scheme "${url.protocol}" not allowed`);
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const allowed = parseAllowedHosts(allowedHostsCsv);
  if (allowed.has(host)) return url;

  if (isIP(host)) {
    if (isBlockedIp(host))
      throw new SsrfBlockedError(
        `literal address ${host} is in a blocked range`,
      );
    return url;
  }

  if (host === 'localhost' || host.endsWith('.localhost')) {
    throw new SsrfBlockedError('localhost is not allowed');
  }

  let records: { address: string }[];
  try {
    records = await dns.lookup(host, { all: true });
  } catch {
    throw new SsrfBlockedError(`DNS resolution failed for ${host}`);
  }
  if (records.length === 0)
    throw new SsrfBlockedError(`no DNS records for ${host}`);
  for (const { address } of records) {
    if (isBlockedIp(address)) {
      throw new SsrfBlockedError(
        `${host} resolves to blocked address ${address}`,
      );
    }
  }
  return url;
}

/**
 * Perform `fetch`, following redirects manually so every hop is re-checked by
 * `assertUrlAllowed`. Caller owns timeouts via `init.signal`.
 */
export async function safeFetch(
  raw: string,
  init: RequestInit,
  allowedHostsCsv?: string,
): Promise<Response> {
  let currentUrl = (await assertUrlAllowed(raw, allowedHostsCsv)).toString();
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(currentUrl, { ...init, redirect: 'manual' });
    if (res.status >= 300 && res.status < 400 && res.headers.has('location')) {
      const next = new URL(res.headers.get('location') as string, currentUrl);
      currentUrl = (
        await assertUrlAllowed(next.toString(), allowedHostsCsv)
      ).toString();
      continue;
    }
    return res;
  }
  throw new SsrfBlockedError(`too many redirects (>${MAX_REDIRECTS})`);
}

@ValidatorConstraint({ name: 'isSafeUrl', async: false })
export class SafeUrlConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isSyntacticallySafeUrl(value);
  }
  defaultMessage(): string {
    return 'url must be a public http(s) URL (private/loopback/link-local addresses are rejected)';
  }
}

export function IsSafeUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: SafeUrlConstraint,
    });
  };
}
