const COOKIE_NAME = '__Host-study_session';
const SESSION_SECONDS = 30 * 24 * 60 * 60;
const encoder = new TextEncoder();

function signingKey(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

function base64Url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64Url(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

export async function passwordMatches(supplied, expected) {
  if (typeof supplied !== 'string' || !expected) return false;
  const [candidate, actual] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(supplied)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  const left = new Uint8Array(candidate);
  const right = new Uint8Array(actual);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export async function createSessionCookie(secret, now = Date.now()) {
  const expires = Math.floor(now / 1000) + SESSION_SECONDS;
  const nonce = crypto.randomUUID();
  const value = `v1.${expires}.${nonce}`;
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await signingKey(secret), encoder.encode(value)));
  return `${COOKIE_NAME}=${value}.${base64Url(signature)}; Max-Age=${SESSION_SECONDS}; Path=/; Secure; HttpOnly; SameSite=Lax`;
}

export async function hasValidSession(cookieHeader, secret, now = Date.now()) {
  if (!secret || !cookieHeader) return false;
  const token = cookieHeader.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  const match = token?.match(/^v1\.(\d{10})\.([a-f0-9-]{36})\.([A-Za-z0-9_-]+)$/);
  if (!match) return false;
  const expires = Number(match[1]);
  const nowSeconds = Math.floor(now / 1000);
  if (expires <= nowSeconds || expires > nowSeconds + SESSION_SECONDS) return false;
  const signature = decodeBase64Url(match[3]);
  if (!signature) return false;
  return crypto.subtle.verify('HMAC', await signingKey(secret), signature, encoder.encode(`v1.${match[1]}.${match[2]}`));
}
