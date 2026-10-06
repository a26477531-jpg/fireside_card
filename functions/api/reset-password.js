import { hashPassword } from '../_lib/crypto.js';
import { validatePassword } from '../_lib/validation.js';
import { json, sessionCookie } from '../_lib/http.js';
import { digest, readBody } from '../_lib/password-reset.js';

export async function onRequestPost({ request, env }) {
  const parsed = await readBody(request);
  if (parsed.response) return parsed.response;
  const { token, password } = parsed.body;
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return json({ ok: false, error: 'invalid-token' }, { status: 400 });
  if (validatePassword(password)) return json({ ok: false, error: 'validation-failed' }, { status: 400 });
  const tokenHash = await digest(token);
  const now = new Date().toISOString();
  const reset = await env.DB.prepare('SELECT user_id FROM password_resets WHERE token_hash = ?1 AND expires_at > ?2 AND consumed_by IS NULL').bind(tokenHash, now).first();
  if (!reset) return json({ ok: false, error: 'invalid-token' }, { status: 400 });
  const passwordHash = await hashPassword(password);
  const claim = crypto.randomUUID();
  // D1 batch is transactional. A unique claim prevents concurrent token reuse.
  const results = await env.DB.batch([
    env.DB.prepare('UPDATE password_resets SET consumed_by = ?1 WHERE token_hash = ?2 AND consumed_by IS NULL AND expires_at > ?3').bind(claim, tokenHash, new Date().toISOString()),
    env.DB.prepare('UPDATE users SET password_hash = ?1, failed_login_count = 0, locked_until = NULL WHERE id = ?2 AND EXISTS (SELECT 1 FROM password_resets WHERE token_hash = ?3 AND consumed_by = ?4)').bind(passwordHash, reset.user_id, tokenHash, claim),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1 AND EXISTS (SELECT 1 FROM password_resets WHERE token_hash = ?2 AND consumed_by = ?3)').bind(reset.user_id, tokenHash, claim),
    env.DB.prepare('DELETE FROM password_resets WHERE user_id = ?1 AND EXISTS (SELECT 1 FROM password_resets WHERE token_hash = ?2 AND consumed_by = ?3)').bind(reset.user_id, tokenHash, claim),
  ]);
  if (!results[0].meta.changes) return json({ ok: false, error: 'invalid-token' }, { status: 400 });
  return json({ ok: true }, { headers: { 'Set-Cookie': sessionCookie('', { clear: true }) } });
}
