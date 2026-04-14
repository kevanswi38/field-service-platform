const encoder = new TextEncoder();

export const AUTHORITY_COOKIE_NAME = "fsm_authority";
export const AUTHORITY_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8;
export const AUTHORITY_SECRET_ENV_KEY = "FSM_AUTH_BRIDGE_SECRET";
export const AUTHORITY_BOOTSTRAP_USER_ENV_KEY = "FSM_DEV_AUTH_USER_ID";

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getAuthoritySecret(): string | null {
  const fromBridgeEnv = process.env[AUTHORITY_SECRET_ENV_KEY]?.trim();
  if (fromBridgeEnv) {
    return fromBridgeEnv;
  }

  const fromNextAuth = process.env.NEXTAUTH_SECRET?.trim();
  if (fromNextAuth) {
    return fromNextAuth;
  }

  return null;
}

async function hmacHex(message: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return bytesToHex(new Uint8Array(signature));
}

export async function signAuthorityCookie(
  userId: string
): Promise<string | null> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return null;
  }

  const secret = getAuthoritySecret();
  if (!secret) {
    return null;
  }

  const signature = await hmacHex(normalizedUserId, secret);
  return `${normalizedUserId}.${signature}`;
}

export async function verifyAuthorityCookie(
  rawCookieValue: string | null | undefined
): Promise<string | null> {
  if (!rawCookieValue) return null;

  const secret = getAuthoritySecret();
  if (!secret) {
    return null;
  }

  const separatorIndex = rawCookieValue.lastIndexOf(".");
  if (separatorIndex < 1) return null;

  const userId = rawCookieValue.slice(0, separatorIndex).trim();
  const signature = rawCookieValue.slice(separatorIndex + 1).trim();

  if (!userId || !signature) return null;

  const expectedSignature = await hmacHex(userId, secret);
  if (signature !== expectedSignature) return null;

  return userId;
}
