// GET /api/users   — 列出所有使用者（需要 user.view 權限）
// POST /api/users  — 新增一個使用者，可以直接指定 role（需要 user.create 權限）
// 權限判斷都交給 middleware（authenticate + requirePermission），這支檔案本身
// 完全不會出現任何 if (user.role === 'admin') 這種判斷。
import { json } from '../_lib/http.js';
import { authenticate, requirePermission } from '../_lib/middleware.js';
import { validateEmail, validateUsername, validatePassword } from '../_lib/validation.js';
import { hashPassword } from '../_lib/crypto.js';
import { ROLE_PERMISSIONS } from '../_lib/permissions.js';

async function listUsers({ env }) {
  // 特地不 select password_hash——就算是 admin 呼叫的 API，也不應該把密碼雜湊值傳回前端。
  const { results } = await env.DB
    .prepare('SELECT id, email, username, role, created_at FROM users ORDER BY id')
    .all();
  return json({ ok: true, users: results });
}

// 這支是「管理員幫別人開帳號」，跟 register.js 的差異：
//   1. 多一個 role 欄位，可以直接指定成 admin（一般註冊永遠只能是 user）。
//   2. 成功後不核發 session cookie——建立的是別人的帳號，不是呼叫者自己登入。
async function createUser({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid-body' }, { status: 400 });
  }

  const email = String(body.email ?? '').trim();
  const username = String(body.username ?? '').trim();
  const password = String(body.password ?? '');
  // 沒帶 role 時預設 'user'；合法值直接看 permissions.js 定義過哪些角色，
  // 不在這裡另外寫死一份 ['user', 'admin']，避免兩邊之後對不齊。
  const role = String(body.role ?? 'user').trim();

  const errors = {
    email: validateEmail(email),
    username: validateUsername(username),
    password: validatePassword(password),
    role: Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role) ? null : 'invalid',
  };
  if (errors.email || errors.username || errors.password || errors.role) {
    return json({ ok: false, error: 'validation-failed', fields: errors }, { status: 400 });
  }

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
      .prepare('INSERT INTO users (email, username, password_hash, role) VALUES (?1, ?2, ?3, ?4)')
      .bind(email, username, passwordHash, role)
      .run();
    userId = result.meta.last_row_id;
  } catch (error) {
    // 跟 register.js 一樣：uniqueness 交給 DB 的 UNIQUE 限制兜底，避免併發時的競態。
    const message = String(error?.message || '');
    if (message.includes('users.email')) {
      return json({ ok: false, error: 'conflict', fields: { email: 'taken', username: null } }, { status: 409 });
    }
    if (message.includes('users.username')) {
      return json({ ok: false, error: 'conflict', fields: { email: null, username: 'taken' } }, { status: 409 });
    }
    return json({ ok: false, error: 'server-error' }, { status: 500 });
  }

  return json({ ok: true, user: { id: userId, email, username, role } }, { status: 201 });
}

export const onRequestGet = [authenticate, requirePermission('user.view'), listUsers];
export const onRequestPost = [authenticate, requirePermission('user.create'), createUser];
