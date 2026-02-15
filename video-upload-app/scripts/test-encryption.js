const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;

function getKey() {
  const keyBase64 = process.env.ENCRYPTION_KEY || process.env.SECRET_ENCRYPTION_KEY;
  if (keyBase64) {
    const key = Buffer.from(keyBase64, 'base64');
    if (key.length !== 32) {
      console.error('ENCRYPTION_KEY must be 32 bytes (base64)');
      process.exit(2);
    }
    return key;
  }

  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  if (!nextAuthSecret) {
    console.error('ENCRYPTION_KEY or NEXTAUTH_SECRET not set');
    process.exit(2);
  }
  const key = require('crypto').createHash('sha256').update(nextAuthSecret).digest();
  return key;
}

function encryptSecret(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptSecret(payload) {
  const key = getKey();
  const [ivB64, tagB64, encB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !encB64) {
    throw new Error('Invalid encrypted payload');
  }
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const encrypted = Buffer.from(encB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

try {
  const sample = 'test-secret-123';
  const enc = encryptSecret(sample);
  const dec = decryptSecret(enc);
  console.log('ENCRYPTION_KEY present and working.');
  console.log('Original:', sample);
  console.log('Encrypted:', enc);
  console.log('Decrypted:', dec);
  process.exit(0);
} catch (err) {
  console.error('Encryption test failed:', err.message || err);
  process.exit(1);
}
