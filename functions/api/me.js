// GET /api/me
// 依 session cookie 回報目前登入中的使用者（若有）。日後「個人收藏卡片」頁面
// 會用這支 API 確認「現在是誰在看」，這裡先預備好，註冊頁面完成後也會用它
// 顯示「已經是 xxx，要用這個帳號繼續嗎？」之類的狀態。
import { readCookie, json, SESSION_COOKIE_NAME } from '../_lib/http.js';

export async function onRequestGet({ request, env }) {
  const token = readCookie(request, SESSION_COOKIE_NAME);
  if (!token) return json({ ok: true, user: null });

  const row = await env.DB
    .prepare(
      `SELECT users.id AS id, users.email AS email, users.username AS username, users.role AS role
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token = ?1 AND sessions.expires_at > ?2
       LIMIT 1`
    )
    .bind(token, new Date().toISOString())
    .first();

  return json({ ok: true, user: row || null });
}
