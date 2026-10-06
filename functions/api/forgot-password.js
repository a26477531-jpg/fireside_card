import { createSessionToken } from '../_lib/crypto.js';
import { validateEmail } from '../_lib/validation.js';
import { json } from '../_lib/http.js';
import { digest, readBody } from '../_lib/password-reset.js';

export async function onRequestPost({ request, env }) {
  const parsed = await readBody(request);
  if (parsed.response) return parsed.response;
  const email = typeof parsed.body.email === 'string' ? parsed.body.email.trim() : '';
  if (validateEmail(email)) return json({ ok: false, error: 'validation-failed' }, { status: 400 });
  let base;
  try {
    base = new URL(env.PASSWORD_RESET_ORIGIN);
    if (base.protocol !== 'https:' || base.username || base.password) throw new Error();
    if (!env.RESEND_API_KEY || !env.PASSWORD_RESET_FROM) throw new Error();
  } catch {
    return json({ ok: false, error: 'service-unavailable' }, { status: 503 });
  }
  const now = Date.now();
  await env.DB.prepare('DELETE FROM password_reset_limits WHERE next_allowed_at < ?1').bind(now).run();
  await env.DB.prepare('DELETE FROM password_resets WHERE expires_at <= ?1').bind(new Date(now).toISOString()).run();
  // Atomic cooldowns also apply to unknown emails; store only hashes.
  for (const [key, delay] of [[`ip:${request.headers.get('CF-Connecting-IP') || 'local'}`, 10000], [`email:${email.toLowerCase()}`, 60000]]) {
    const result = await env.DB.prepare(`INSERT INTO password_reset_limits(key_hash, next_allowed_at) VALUES (?1, ?2)
      ON CONFLICT(key_hash) DO UPDATE SET next_allowed_at = excluded.next_allowed_at
      WHERE password_reset_limits.next_allowed_at <= ?3`).bind(await digest(key), now + delay, now).run();
    if (!result.meta.changes) return json({ ok: true });
  }
  const user = await env.DB.prepare('SELECT id, email FROM users WHERE email = ?1').bind(email).first();
  if (!user) return json({ ok: true });
  const token = createSessionToken();
  const tokenHash = await digest(token);
  await env.DB.prepare('INSERT INTO password_resets(token_hash, user_id, expires_at) VALUES (?1, ?2, ?3)')
    .bind(tokenHash, user.id, new Date(now + 30 * 60000).toISOString()).run();
  const link = new URL('/reset-password.html', base.origin);
  link.hash = new URLSearchParams({ token }).toString();
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': tokenHash },
      body: JSON.stringify({ from: env.PASSWORD_RESET_FROM, to: [user.email],
        subject: 'Fireside Cards｜重設密碼 / Reset password',
        text: `請開啟以下連結重設密碼（30 分鐘內有效）。若您未提出申請，請忽略此信。\nOpen this link to reset your password within 30 minutes. If you did not request this, ignore this email.\n\n${link.href}` }),
    });
    if (!response.ok) throw new Error();
  } catch {
    await env.DB.prepare('DELETE FROM password_resets WHERE token_hash = ?1').bind(tokenHash).run();
    // Keep public responses identical; logs contain neither emails nor tokens.
    console.error('Password reset email delivery failed');
  }
  return json({ ok: true });
}
