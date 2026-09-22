// POST /api/register
// Body: { email, username, password }
// 建立帳號：伺服器端重新驗證一次格式（絕對不能只信任前端），確認 Email／使用者名稱
// 沒被註冊過，雜湊密碼後寫入 D1，成功後核發 session cookie（等於註冊完直接登入）。
import { validateEmail, validateUsername, validatePassword } from '../_lib/validation.js';
import { hashPassword, createSessionToken } from '../_lib/crypto.js';
import { json, sessionCookie, SESSION_TTL_SECONDS } from '../_lib/http.js';

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid-body' }, { status: 400 });
  }

  const email = String(body.email ?? '').trim();
  const username = String(body.username ?? '').trim();
  const password = String(body.password ?? '');

  const errors = {
    email: validateEmail(email),
    username: validateUsername(username),
    password: validatePassword(password),
  };
  if (errors.email || errors.username || errors.password) {
    return json({ ok: false, error: 'validation-failed', fields: errors }, { status: 400 });
  }

  // 先各自查一次，能給出「究竟是 Email 還是使用者名稱重複」的明確錯誤；
  // 但兩個請求同時搶同一個名稱的情況，還是要靠下面 INSERT 的 UNIQUE 限制擋下來。
  const [emailTaken, usernameTaken] = await Promise.all([
    env.DB.prepare('SELECT 1 FROM users WHERE email = ?1 LIMIT 1').bind(email).first(),
    env.DB.prepare('SELECT 1 FROM users WHERE username = ?1 LIMIT 1').bind(username).first(),
  ]);
  if (emailTaken || usernameTaken) {
    return json({
      ok: false,
      error: 'conflict',
      fields: { email: emailTaken ? 'taken' : null, username: usernameTaken ? 'taken' : null },
    }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  let userId;
  try {
    const result = await env.DB
      .prepare('INSERT INTO users (email, username, password_hash) VALUES (?1, ?2, ?3)')
      .bind(email, username, passwordHash)
      .run();
    userId = result.meta.last_row_id;
  } catch (error) {
    const message = String(error?.message || '');
    if (message.includes('users.email')) {
      return json({ ok: false, error: 'conflict', fields: { email: 'taken', username: null } }, { status: 409 });
    }
    if (message.includes('users.username')) {
      return json({ ok: false, error: 'conflict', fields: { email: null, username: 'taken' } }, { status: 409 });
    }
    return json({ ok: false, error: 'server-error' }, { status: 500 });
  }

  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  await env.DB
    .prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?1, ?2, ?3)')
    .bind(token, userId, expiresAt)
    .run();

  // coinBalance 直接寫死 60：資料庫欄位的 DEFAULT 60 已經保證新帳號一定是這個數字，
  // 這裡不用多查一次資料庫。
  return json(
    { ok: true, user: { id: userId, email, username, coinBalance: 60 } },
    { status: 201, headers: { 'Set-Cookie': sessionCookie(token) } }
  );
}
