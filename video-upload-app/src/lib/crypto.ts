import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // recommended for GCM

function getKey() {
  // Prefer an explicit base64-encoded ENCRYPTION_KEY (32 bytes).
  const keyBase64 = process.env.ENCRYPTION_KEY || process.env.SECRET_ENCRYPTION_KEY;
  if (keyBase64) {
    const key = Buffer.from(keyBase64, 'base64');
    if (key.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes (base64)');
    return key;
  }

  // Fallback: derive a 32-byte key from NEXTAUTH_SECRET using SHA-256.
  // This avoids requiring users to generate a separate base64 key.
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  if (!nextAuthSecret) throw new Error('ENCRYPTION_KEY or NEXTAUTH_SECRET must be set');
  const hash = crypto.createHash('sha256').update(nextAuthSecret).digest();
  return Buffer.from(hash);
}

export function encryptSecret(plaintext: string) {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(payload: string) {
  const key = getKey();
  const [ivB64, tagB64, encB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !encB64) throw new Error('Invalid encrypted payload');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const encrypted = Buffer.from(encB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
