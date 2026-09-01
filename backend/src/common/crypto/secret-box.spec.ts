import {
  decryptSecret,
  encryptSecret,
  isEncrypted,
  safeEqual,
} from './secret-box';

describe('secret-box', () => {
  it('round-trips a value through encrypt/decrypt', () => {
    const plain = JSON.stringify({ cookies: [{ name: 's', value: 'abc' }] });
    const enc = encryptSecret(plain);

    expect(enc).toMatch(/^v1\./);
    expect(enc).not.toContain('abc');
    expect(isEncrypted(enc)).toBe(true);
    expect(decryptSecret(enc)).toBe(plain);
  });

  it('produces a different ciphertext each call (random IV)', () => {
    expect(encryptSecret('x')).not.toBe(encryptSecret('x'));
  });

  it('passes through legacy plaintext values untouched', () => {
    expect(isEncrypted('{"cookies":[]}')).toBe(false);
    expect(decryptSecret('{"cookies":[]}')).toBe('{"cookies":[]}');
  });

  it('fails to decrypt a tampered payload', () => {
    const enc = encryptSecret('secret');
    const parts = enc.split('.');
    parts[3] = Buffer.from('tampered').toString('base64');
    expect(() => decryptSecret(parts.join('.'))).toThrow();
  });

  it('safeEqual compares in constant length-checked fashion', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
