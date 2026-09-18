// GET /api/users
// 列出所有使用者（只有 admin 可以用，需要 user.view 權限）。
// 權限判斷都交給 middleware（authenticate + requirePermission），這支檔案本身
// 完全不會出現任何 if (user.role === 'admin') 這種判斷。
import { json } from '../_lib/http.js';
import { authenticate, requirePermission } from '../_lib/middleware.js';

async function listUsers({ env }) {
  // 特地不 select password_hash——就算是 admin 呼叫的 API，也不應該把密碼雜湊值傳回前端。
  const { results } = await env.DB
    .prepare('SELECT id, email, username, role, created_at FROM users ORDER BY id')
    .all();
  return json({ ok: true, users: results });
}

export const onRequestGet = [authenticate, requirePermission('user.view'), listUsers];
