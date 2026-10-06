import { json, readCookie, SESSION_COOKIE_NAME } from '../../_lib/http.js';
import { createSessionToken } from '../../_lib/crypto.js';
import { configured, currentUser, callbackUrl, challenge, stateCookie } from '../../_lib/google-auth.js';

export async function onRequestPost({ request, env }) {
  if (!configured(env)) return json({ ok: false, error: 'unavailable' }, { status: 503 });
  const origin = new URL(env.GOOGLE_AUTH_ORIGIN).origin;
  if (new URL(request.url).origin !== origin || request.headers.get('Origin') !== origin) {
    return json({ ok: false, error: 'forbidden' }, { status: 403 });
  }
  let body;
  try { body = await request.json(); } catch { return json({ ok: false }, { status: 400 }); }
  if (!body || !['login', 'link'].includes(body.intent)) return json({ ok: false }, { status: 400 });
  const user = await currentUser(request, env);
  if ((body.intent === 'link' && !user) || (body.intent === 'login' && user)) return json({ ok: false, error: 'session-changed' }, { status: 409 });
  const state = createSessionToken();
  const verifier = createSessionToken();
  await env.DB.prepare('DELETE FROM google_oauth_states WHERE expires_at <= ?1').bind(new Date().toISOString()).run();
  await env.DB.prepare('INSERT INTO google_oauth_states (state, verifier, session_token, user_id, expires_at) VALUES (?1, ?2, ?3, ?4, ?5)')
    .bind(state, verifier, user ? readCookie(request, SESSION_COOKIE_NAME) : null, user?.id || null, new Date(Date.now() + 600000).toISOString()).run();
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, redirect_uri: callbackUrl(env),
    response_type: 'code', scope: 'openid email profile', state, code_challenge: await challenge(verifier),
    code_challenge_method: 'S256', prompt: 'select_account' }).toString();
  return json({ ok: true, url: url.href }, { headers: { 'Set-Cookie': stateCookie(state) } });
}
