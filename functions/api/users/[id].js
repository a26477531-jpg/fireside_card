// GET    /api/users/:id  — 查詢單一使用者（需要 user.view 權限）
// PATCH  /api/users/:id  — 編輯使用者的 email／username／role／password（需要 user.edit 權限）
// DELETE /api/users/:id  — 刪除使用者（需要 user.delete 權限）
//
// 這支檔案補上 users.js 原本缺的 Update／Delete，讓「使用者管理」這個 CRUD 湊齊四個動作。
// 權限一樣全部交給 middleware（authenticate + requirePermission），這支檔案不會出現
// if (user.role === 'admin') 這種寫法。
import { json } from '../../_lib/http.js';
import { authenticate, requirePermission } from '../../_lib/middleware.js';
import { validateEmail, validateUsername, validatePassword } from '../../_lib/validation.js';
import { hashPassword } from '../../_lib/crypto.js';
import { ROLE_PERMISSIONS } from '../../_lib/permissions.js';

// 網址上的 :id 是字串，統一在這裡轉成正整數，順便擋掉 /api/users/abc 這種怪網址。
function parseUserId(params) {
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function getUser({ env, params }) {
  const id = parseUserId(params);
  if (!id) return json({ ok: false, error: 'invalid-id' }, { status: 400 });

  const user = await env.DB
    .prepare('SELECT id, email, username, role, created_at FROM users WHERE id = ?1')
    .bind(id)
    .first();
  if (!user) return json({ ok: false, error: 'not-found' }, { status: 404 });

  return json({ ok: true, user });
}

// 更新使用者：email／username／role／password 都是「有帶欄位才改」，沒帶的維持原樣。
// 密碼欄位刻意也放在這裡（不用另外開一支 API），方便 admin 幫忘記密碼的使用者重設。
async function updateUser({ request, env, params }) {
  const id = parseUserId(params);
  if (!id) return json({ ok: false, error: 'invalid-id' }, { status: 400 });

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid-body' }, { status: 400 });
  }

  const target = await env.DB
    .prepare('SELECT id, email, username, role FROM users WHERE id = ?1')
    .bind(id)
    .first();
  if (!target) return json({ ok: false, error: 'not-found' }, { status: 404 });

  const hasEmail = Object.prototype.hasOwnProperty.call(body, 'email');
  const hasUsername = Object.prototype.hasOwnProperty.call(body, 'username');
  const hasRole = Object.prototype.hasOwnProperty.call(body, 'role');
  const hasPassword = Object.prototype.hasOwnProperty.call(body, 'password');

  if (!hasEmail && !hasUsername && !hasRole && !hasPassword) {
    return json({ ok: false, error: 'validation-failed', message: 'no-fields-to-update' }, { status: 400 });
  }

  const email = hasEmail ? String(body.email ?? '').trim() : target.email;
  const username = hasUsername ? String(body.username ?? '').trim() : target.username;
  const role = hasRole ? String(body.role ?? '').trim() : target.role;
  const password = hasPassword ? String(body.password ?? '') : null;

  const errors = {
    email: hasEmail ? validateEmail(email) : null,
    username: hasUsername ? validateUsername(username) : null,
    role: hasRole && !Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role) ? 'invalid' : null,
    password: hasPassword ? validatePassword(password) : null,
  };
  if (errors.email || errors.username || errors.role || errors.password) {
    return json({ ok: false, error: 'validation-failed', fields: errors }, { status: 400 });
  }

  // 保護機制：不能把系統裡最後一個 admin 降級，不然會變成沒有人能再管理使用者。
  // 這裡不限定「是不是在改自己」——邏輯上只要會讓 admin 人數歸零，一律擋下。
  if (hasRole && target.role === 'admin' && role !== 'admin') {
    const adminCount = await env.DB
      .prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'")
      .first();
    if ((adminCount?.count ?? 0) <= 1) {
      return json({ ok: false, error: 'last-admin' }, { status: 409 });
    }
  }

  if (hasEmail || hasUsername) {
    // 這裡簡化成一次查詢：只要撞到就把有變更的欄位都標成 taken，不細分是哪一個撞到的
    // （真的要精準分辨，可以比照 register.js 拆成兩次查詢，但這支是 admin 用的管理功能，
    // 犧牲一點訊息精準度換取程式碼簡單，划算)。
    const conflict = await env.DB
      .prepare('SELECT id FROM users WHERE id != ?1 AND (email = ?2 OR username = ?3) LIMIT 1')
      .bind(id, email, username)
      .first();
    if (conflict) {
      return json({
        ok: false,
        error: 'conflict',
        fields: { email: hasEmail ? 'taken' : null, username: hasUsername ? 'taken' : null },
      }, { status: 409 });
    }
  }

  const sets = [];
  const values = [];
  let i = 1;
  if (hasEmail) { sets.push(`email = ?${i}`); values.push(email); i++; }
  if (hasUsername) { sets.push(`username = ?${i}`); values.push(username); i++; }
  if (hasRole) { sets.push(`role = ?${i}`); values.push(role); i++; }
  if (hasPassword) {
    const passwordHash = await hashPassword(password);
    sets.push(`password_hash = ?${i}`); values.push(passwordHash); i++;
    // 順便解鎖、重設失敗次數，避免 admin 幫忙重設密碼後，使用者卻因為舊的鎖定紀錄還是登不進去。
    sets.push('failed_login_count = 0');
    sets.push('locked_until = NULL');
  }
  values.push(id);

  try {
    await env.DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?${i}`).bind(...values).run();
  } catch (error) {
    // 跟 users.js 一樣：唯一性交給 DB 的 UNIQUE 限制兜底，避免併發請求的競態。
    const message = String(error?.message || '');
    if (message.includes('users.email')) {
      return json({ ok: false, error: 'conflict', fields: { email: 'taken', username: null } }, { status: 409 });
    }
    if (message.includes('users.username')) {
      return json({ ok: false, error: 'conflict', fields: { email: null, username: 'taken' } }, { status: 409 });
    }
    return json({ ok: false, error: 'server-error' }, { status: 500 });
  }

  const updated = await env.DB
    .prepare('SELECT id, email, username, role, created_at FROM users WHERE id = ?1')
    .bind(id)
    .first();
  return json({ ok: true, user: updated });
}

async function deleteUser({ env, params, data }) {
  const id = parseUserId(params);
  if (!id) return json({ ok: false, error: 'invalid-id' }, { status: 400 });

  // 不能刪自己的帳號：避免不小心把自己踢出系統，也連帶避免系統裡一個 admin 都不剩
  // （要刪自己的帳號，得請另一位 admin 動手，這是刻意的設計，不是漏洞）。
  if (id === data.user.id) {
    return json({ ok: false, error: 'cannot-delete-self' }, { status: 400 });
  }

  const target = await env.DB.prepare('SELECT id FROM users WHERE id = ?1').bind(id).first();
  if (!target) return json({ ok: false, error: 'not-found' }, { status: 404 });

  // sessions 表已經設定 ON DELETE CASCADE，理論上刪 users 就會連帶刪掉對應 session；
  // 這裡還是手動先刪一次 sessions，多一層保險，不完全依賴 D1 是否有開啟外鍵約束。
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1').bind(id).run();
  await env.DB.prepare('DELETE FROM users WHERE id = ?1').bind(id).run();

  return json({ ok: true, deletedId: id });
}

export const onRequestGet = [authenticate, requirePermission('user.view'), getUser];
export const onRequestPatch = [authenticate, requirePermission('user.edit'), updateUser];
export const onRequestDelete = [authenticate, requirePermission('user.delete'), deleteUser];
