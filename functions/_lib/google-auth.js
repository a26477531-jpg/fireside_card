import { readCookie, SESSION_COOKIE_NAME } from './http.js';

export const STATE_COOKIE = 'fireside_google_state';
export function stateCookie(value = '') {
  return `${STATE_COOKIE}=${value}; Path=/api/google; Max-Age=${value ? 600 : 0}; HttpOnly; Secure; SameSite=Lax`;
}
export function configured(env) {
  try {
    return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && new URL(env.GOOGLE_AUTH_ORIGIN).protocol === 'https:');
  } catch { return false; }
}
export function callbackUrl(env) {
  return new URL('/api/google/callback', env.GOOGLE_AUTH_ORIGIN).href;
}
export async function currentUser(request, env) {
  const token = readCookie(request, SESSION_COOKIE_NAME);
  if (!token) return null;
  return env.DB.prepare('SELECT users.id, users.email FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token = ?1 AND sessions.expires_at > ?2').bind(token, new Date().toISOString()).first();
}
export async function challenge(verifier) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
// Only use tokens obtained directly from Google's server with our client credentials.
// Identity comes from the authenticated userinfo endpoint, never browser-supplied claims.
export async function googleIdentity(code, verifier, env) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', signal: AbortSignal.timeout(15000),
    body: new URLSearchParams({ code, code_verifier: verifier, client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: callbackUrl(env), grant_type: 'authorization_code' }),
  });
  if (!response.ok) throw new Error('google-token');
  const tokens = await response.json();
  if (typeof tokens.access_token !== 'string' || !tokens.access_token) throw new Error('google-token');
  const profile = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` }, signal: AbortSignal.timeout(15000),
  });
  if (!profile.ok) throw new Error('google-profile');
  const identity = await profile.json();
  if (typeof identity.sub !== 'string' || !identity.sub || identity.sub.length > 255 ||
      identity.email_verified !== true || typeof identity.email !== 'string' || !identity.email.includes('@')) {
    throw new Error('google-profile');
  }
  return identity;
}
