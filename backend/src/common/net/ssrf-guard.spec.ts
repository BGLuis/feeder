import { promises as dns } from 'node:dns';
import {
  assertUrlAllowed,
  isBlockedIp,
  isSyntacticallySafeUrl,
  SafeUrlConstraint,
  SsrfBlockedError,
} from './ssrf-guard';

describe('ssrf-guard', () => {
  describe('isBlockedIp', () => {
    it.each([
      ['127.0.0.1', true],
      ['10.1.2.3', true],
      ['172.16.9.9', true],
      ['192.168.0.5', true],
      ['169.254.169.254', true], // cloud metadata
      ['0.0.0.0', true],
      ['::1', true],
      ['fd00::1', true],
      ['fe80::1', true],
      ['::ffff:127.0.0.1', true],
      ['8.8.8.8', false],
      ['1.1.1.1', false],
      ['not-an-ip', true],
    ])('%s -> blocked=%s', (ip, expected) => {
      expect(isBlockedIp(ip)).toBe(expected);
    });
  });

  describe('isSyntacticallySafeUrl', () => {
    it('rejects non-http schemes, localhost and literal private IPs', () => {
      expect(isSyntacticallySafeUrl('file:///etc/passwd')).toBe(false);
      expect(isSyntacticallySafeUrl('http://localhost/x')).toBe(false);
      expect(isSyntacticallySafeUrl('http://127.0.0.1/x')).toBe(false);
      expect(isSyntacticallySafeUrl('http://169.254.169.254/')).toBe(false);
      expect(isSyntacticallySafeUrl('https://example.com/feed.xml')).toBe(true);
    });
  });

  describe('SafeUrlConstraint', () => {
    it('mirrors isSyntacticallySafeUrl', () => {
      const c = new SafeUrlConstraint();
      expect(c.validate('https://example.com')).toBe(true);
      expect(c.validate('http://10.0.0.1')).toBe(false);
      expect(c.validate(123 as any)).toBe(false);
    });
  });

  describe('assertUrlAllowed', () => {
    afterEach(() => jest.restoreAllMocks());

    it('throws for a host that resolves to a private address', async () => {
      jest
        .spyOn(dns, 'lookup')
        // @ts-expect-error partial mock
        .mockResolvedValue([{ address: '10.0.0.7', family: 4 }]);
      await expect(
        assertUrlAllowed('http://evil.example'),
      ).rejects.toBeInstanceOf(SsrfBlockedError);
    });

    it('allows a host that resolves to a public address', async () => {
      jest
        .spyOn(dns, 'lookup')
        // @ts-expect-error partial mock
        .mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
      await expect(
        assertUrlAllowed('https://example.com/feed'),
      ).resolves.toBeInstanceOf(URL);
    });

    it('honours the allowlist without resolving DNS', async () => {
      const spy = jest.spyOn(dns, 'lookup');
      await expect(
        assertUrlAllowed('http://mysql:3306/', 'mysql,localhost'),
      ).resolves.toBeInstanceOf(URL);
      expect(spy).not.toHaveBeenCalled();
    });

    it('rejects non-http schemes outright', async () => {
      await expect(
        assertUrlAllowed('ftp://example.com'),
      ).rejects.toBeInstanceOf(SsrfBlockedError);
    });
  });
});
