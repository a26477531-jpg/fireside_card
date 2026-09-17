// GET /api/check-email?email=xxx
// 註冊表單即時檢查 Email 格式是否正確、是否已經被註冊過。
import { validateEmail } from '../_lib/validation.js';
import { json } from '../_lib/http.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const email = (url.searchParams.get('email') || '').trim();

  const formatError = validateEmail(email);
  if (formatError) return json({ available: false, reason: formatError });

  const existing = await env.DB
    .prepare('SELECT 1 FROM users WHERE email = ?1 LIMIT 1')
    .bind(email)
    .first();

  return json({ available: !existing, reason: existing ? 'taken' : null });
}
