// POST /api/logout
// 登出：刪掉伺服器端的 session 紀錄並清掉 cookie。
import { readCookie, json, sessionCookie, SESSION_COOKIE_NAME } from '../_lib/http.js';

export async function onRequestPost({ request, env }) {
  const token = readCookie(request, SESSION_COOKIE_NAME);
  if (token) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?1').bind(token).run();
  }
  return json({ ok: true }, { headers: { 'Set-Cookie': sessionCookie(null, { clear: true }) } });
}
