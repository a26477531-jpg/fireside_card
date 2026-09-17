// 共用的小工具：統一 JSON 回應格式、設定 session cookie。
// 前端跟 API 是同一個網域（Cloudflare Pages Functions 就掛在同一個 Pages 專案下），
// 不需要處理 CORS。

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(init.headers || {}),
    },
  });
}

export const SESSION_COOKIE_NAME = 'fireside_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 天

export function sessionCookie(token, { clear = false } = {}) {
  const maxAge = clear ? 0 : SESSION_TTL_SECONDS;
  const value = clear ? '' : token;
  // Secure 在本機 http://localhost 開發時瀏覽器會直接忽略這個 cookie，屬正常現象，
  // 部署到 Cloudflare Pages（強制 https）之後就會正常運作。
  return `${SESSION_COOKIE_NAME}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export function readCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}
