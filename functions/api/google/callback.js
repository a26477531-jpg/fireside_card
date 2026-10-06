import { readCookie, SESSION_COOKIE_NAME, sessionCookie, SESSION_TTL_SECONDS } from '../../_lib/http.js';
import { createSessionToken, hashPassword } from '../../_lib/crypto.js';
import { STATE_COOKIE, stateCookie, configured, currentUser, googleIdentity } from '../../_lib/google-auth.js';

export async function onRequestGet({ request, env }) {
  const finish = (result, token) => {
    const headers = new Headers({ Location: `/login.html?google=${result}`, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    headers.append('Set-Cookie', stateCookie());
    if (token) headers.append('Set-Cookie', sessionCookie(token));
    return new Response(null, { status: 303, headers });
  };
  if (!configured(env)) return finish('unavailable');
  const url = new URL(request.url);
  if (url.origin !== new URL(env.GOOGLE_AUTH_ORIGIN).origin) return finish('failed');
  const state = url.searchParams.get('state');
  if (!state || state !== readCookie(request, STATE_COOKIE)) return finish('failed');
  try {
    // DELETE RETURNING consumes the challenge atomically, including concurrent callbacks.
    const attempt = await env.DB.prepare('DELETE FROM google_oauth_states WHERE state = ?1 RETURNING *').bind(state).first();
    if (!attempt || Date.parse(attempt.expires_at) <= Date.now()) return finish('failed');
    if (url.searchParams.has('error')) return finish('cancelled');
    const code = url.searchParams.get('code');
    if (!code) return finish('failed');
    const user = await currentUser(request, env);
    if (attempt.user_id) {
      if (!user || user.id !== attempt.user_id || readCookie(request, SESSION_COOKIE_NAME) !== attempt.session_token) return finish('session-changed');
    } else if (user) return finish('session-changed');
    const identity = await googleIdentity(code, attempt.verifier, env);
    // Recheck after the network round trip in case the original session was revoked.
    if (attempt.user_id) {
      const activeUser = await currentUser(request, env);
      if (!activeUser || activeUser.id !== attempt.user_id) return finish('session-changed');
    }
    const linked = await env.DB.prepare('SELECT user_id FROM google_accounts WHERE subject = ?1').bind(identity.sub).first();
    let userId;
    if (attempt.user_id) {
      if (linked && linked.user_id !== user.id) return finish('conflict');
      const existing = await env.DB.prepare('SELECT subject FROM google_accounts WHERE user_id = ?1').bind(user.id).first();
      if (existing && existing.subject !== identity.sub) return finish('conflict');
      if (!existing) await env.DB.prepare('INSERT INTO google_accounts (subject, user_id, email) VALUES (?1, ?2, ?3)').bind(identity.sub, user.id, identity.email).run();
      return finish('linked');
    }
    if (linked) userId = linked.user_id;
    else {
      const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?1').bind(identity.email).first();
      if (existing) return finish('existing-account');
      const username = `google_${createSessionToken().slice(0, 12)}`;
      // A random, unknown password preserves the existing schema; password recovery
      // lets this user choose a password later. Both inserts commit or roll back together.
      const passwordHash = await hashPassword(createSessionToken());
      await env.DB.batch([
        env.DB.prepare('INSERT INTO users (email, username, password_hash) VALUES (?1, ?2, ?3)').bind(identity.email, username, passwordHash),
        env.DB.prepare('INSERT INTO google_accounts (subject, user_id, email) SELECT ?1, id, ?2 FROM users WHERE username = ?3').bind(identity.sub, identity.email, username),
      ]);
      userId = (await env.DB.prepare('SELECT user_id FROM google_accounts WHERE subject = ?1').bind(identity.sub).first()).user_id;
    }
    const token = createSessionToken();
    await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?1, ?2, ?3)').bind(token, userId, new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString()).run();
    return finish('signed-in', token);
  } catch (error) {
    return finish(String(error?.message || '').includes('UNIQUE constraint') ? 'conflict' : 'failed');
  }
}
