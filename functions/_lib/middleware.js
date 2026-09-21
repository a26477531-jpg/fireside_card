// Middleware 層：對應「User → Role → Permission」流程。
// Cloudflare Pages Functions 的路由可以匯出一個函式陣列（例如：
// export const onRequestGet = [authenticate, requirePermission('user.view'), handler]），
// 陣列裡每個函式都拿到同一個 context，呼叫 context.next() 才會繼續執行下一個；
// 不呼叫、直接 return 一個 Response，就會提前中斷、後面的都不會執行。
import { readCookie, json, SESSION_COOKIE_NAME } from './http.js';
import { hasPermission } from './permissions.js';

// 確認「現在是誰在呼叫」，並把使用者資料（含 role）放進 context.data.user
// 給後面的 requirePermission、以及最終的 API handler 使用。
// 沒登入（沒 cookie／session 不存在或過期）一律回 401。
export async function authenticate(context) {
  const { request, env, next, data } = context;
  const token = readCookie(request, SESSION_COOKIE_NAME);
  if (!token) return json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  const user = await env.DB
    .prepare(
      `SELECT users.id AS id, users.email AS email, users.username AS username, users.role AS role
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token = ?1 AND sessions.expires_at > ?2
       LIMIT 1`
    )
    .bind(token, new Date().toISOString())
    .first();

  if (!user) return json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  data.user = user; // role 是從資料庫查出來的，不是前端傳來的
  return next();
}

// 確認「這個角色有沒有這項權限」。一定要排在 authenticate 後面使用，
// 這樣 context.data.user 才會有值；權限不足回 403。
export function requirePermission(permission) {
  return function requirePermissionMiddleware(context) {
    const user = context.data.user;
    if (!user || !hasPermission(user.role, permission)) {
      return json({ ok: false, error: 'forbidden' }, { status: 403 });
    }
    return context.next();
  };
}
