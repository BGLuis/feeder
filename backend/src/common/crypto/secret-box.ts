import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

/**
 * Small AES-256-GCM helper for encrypting sensitive values at rest
 * (currently `Subscription.authStorageState`, which holds third-party session
 * cookies). Self-contained on purpose — the vendored `EncryptionModule` pulls in
 * a config schema from another project and cannot be wired here safely.
 *
 * Key comes from `ENCRYPTION_KEY` (64 hex chars = 32 bytes), validated at boot.
 * Wire format: `v1.<iv b64>.<tag b64>.<ciphertext b64>`.
 */

const PREFIX = 'v1';

function key(): Buffer {
  const hex = process.env.ENCRYPTION_KEY ?? '';
  if (hex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString('base64'),
    tag.toString('base64'),
    enc.toString('base64'),
  ].join('.');
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX + '.');
}

export function decryptSecret(payload: string): string {
  if (!isEncrypted(payload)) {
    // Backwards-compat: value stored before encryption was introduced.
    return payload;
  }
  const [, ivB64, tagB64, dataB64] = payload.split('.');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key(),
    Buffer.from(ivB64, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/** Constant-time string compare (for HMAC signature verification helpers). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
