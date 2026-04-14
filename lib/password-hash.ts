import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 64;
const SALT_BYTES = 16;

const HASH_PREFIX = "scrypt";

function normalizePassword(password: string) {
  return password.normalize("NFKC");
}

export function hashPassword(password: string): string {
  const normalized = normalizePassword(password);
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const derived = scryptSync(normalized, salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  return [
    HASH_PREFIX,
    String(SCRYPT_N),
    String(SCRYPT_R),
    String(SCRYPT_P),
    salt,
    derived.toString("hex"),
  ].join("$");
}

export function verifyPassword(
  candidatePassword: string,
  storedPasswordHash: string
): boolean {
  const parts = storedPasswordHash.split("$");
  if (parts.length !== 6) {
    return false;
  }

  const [prefix, nValue, rValue, pValue, salt, expectedHashHex] = parts;
  if (prefix !== HASH_PREFIX || !salt || !expectedHashHex) {
    return false;
  }

  const N = Number(nValue);
  const r = Number(rValue);
  const p = Number(pValue);
  if (
    !Number.isInteger(N) ||
    !Number.isInteger(r) ||
    !Number.isInteger(p) ||
    N <= 0 ||
    r <= 0 ||
    p <= 0
  ) {
    return false;
  }

  const expected = Buffer.from(expectedHashHex, "hex");
  if (expected.length === 0) {
    return false;
  }

  const normalized = normalizePassword(candidatePassword);
  const derived = scryptSync(normalized, salt, expected.length, {
    N,
    r,
    p,
  });

  if (derived.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(derived, expected);
}
