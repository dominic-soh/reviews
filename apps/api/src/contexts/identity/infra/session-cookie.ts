import { authSecret } from './auth';

async function signCookie(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(value),
  );
  const bytes = new Uint8Array(signature);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return encodeURIComponent(`${value}.${btoa(binary)}`);
}

export async function sessionCookie(token: string): Promise<string> {
  const signed = await signCookie(token, authSecret);
  return `better-auth.session_token=${signed}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`;
}
