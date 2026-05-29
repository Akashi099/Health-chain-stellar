import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCallback);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  const [salt, existingHash] = encodedHash.split(':');
  if (!salt || !existingHash) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const existingBuffer = Buffer.from(existingHash, 'hex');

  if (existingBuffer.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(existingBuffer, derivedKey);
}

/**
 * Pre-computed dummy hash used to normalise timing when a user is not found.
 * Initialised once at startup so the salt is stable across requests.
 */
let _dummyHash: string | null = null;

async function getDummyHash(): Promise<string> {
  if (!_dummyHash) {
    _dummyHash = await hashPassword('dummy-timing-normalisation-value');
  }
  return _dummyHash;
}

/**
 * Runs a full scrypt derivation against a dummy hash and always returns false.
 * Call this on the "user not found" path to match the timing of a real verify.
 */
export async function dummyVerify(password: string): Promise<false> {
  await verifyPassword(password, await getDummyHash());
  return false;
}
