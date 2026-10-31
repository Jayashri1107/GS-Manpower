// Encryption at rest for form submissions and resumes: AES-256-GCM, random 12-byte IV per file.
// File layout: "GSM1" | iv (12) | auth tag (16) | ciphertext
const crypto = require('crypto');

const MAGIC = Buffer.from('GSM1');

function encrypt(key, plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), body]);
}

function decrypt(key, blob) {
  if (!blob.subarray(0, 4).equals(MAGIC)) throw new Error('Not an encrypted GSM file');
  const iv = blob.subarray(4, 16);
  const tag = blob.subarray(16, 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(blob.subarray(32)), decipher.final()]);
}

const encryptJson = (key, obj) => encrypt(key, Buffer.from(JSON.stringify(obj), 'utf8'));
const decryptJson = (key, blob) => JSON.parse(decrypt(key, blob).toString('utf8'));

// Admin password hashing (scrypt). Stored as "scrypt$<salt b64>$<hash b64>".
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function verifyPassword(password, stored) {
  const [scheme, saltB64, hashB64] = String(stored).split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = crypto.scryptSync(String(password), Buffer.from(saltB64, 'base64'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

module.exports = { encrypt, decrypt, encryptJson, decryptJson, hashPassword, verifyPassword };
