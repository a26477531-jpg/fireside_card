// GET /api/check-username?username=xxx
// 註冊表單即時檢查使用者名稱格式是否正確、是否已經被註冊。
import { validateUsername } from '../_lib/validation.js';
import { json } from '../_lib/http.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const username = (url.searchParams.get('username') || '').trim();

  const formatError = validateUsername(username);
  if (formatError) return json({ available: false, reason: formatError });

  const existing = await env.DB
    .prepare('SELECT 1 FROM users WHERE username = ?1 LIMIT 1')
    .bind(username)
    .first();

  return json({ available: !existing, reason: existing ? 'taken' : null });
}
