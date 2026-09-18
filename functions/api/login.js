// POST /api/login
// Body: { identifier, password }   // identifier 可以是使用者名稱或 Email
//
// 資安設計重點（對應登入流程圖，但把「使用者名稱錯誤」與「密碼錯誤」合併成
// 同一句「帳號或密碼錯誤」，避免使用者枚舉攻擊——詳見下方註解）：
//
// 1. 不管是查無此帳號、還是帳號存在但密碼錯，一律回傳同一個 error code
//    'invalid-credentials'，前端也顯示同一句話。如果分開顯示「查無此使用者」
//    跟「密碼錯誤」，攻擊者可以拿大量帳號名稱去試，用回應內容反推出網站裡
//    有哪些帳號真的存在，這是很常見的資安漏洞（User Enumeration）。
// 2. 查無帳號時，仍然跑一次「格式正確但內容是假的」密碼雜湊運算
//    （DUMMY_PASSWORD_HASH），讓「帳號不存在」跟「帳號存在但密碼錯」兩種
//    情況的回應時間差不多。否則攻擊者可以用回應時間的快慢差異，一樣能反推
//    出帳號是否存在（時序攻擊）。
// 3. 連續密碼錯誤達 5 次會鎖定該帳號 15 分鐘（鎖定期間內不再驗證密碼，
//    避免繼續浪費運算資源，也避免鎖定時間被無限刷新）。這裡選擇「鎖帳號」
//    而不是「鎖 IP」，做法簡單、適合這個規模的作品集網站；缺點是理論上
//    可以被用來惡意鎖定別人的帳號（用錯的密碼狂打某人的帳號 5 次），
//    正式營運等級的系統通常會同時搭配 IP 或裝置維度的限制，未來如果需要
//    可以再加。
import { verifyPassword, createSessionToken, DUMMY_PASSWORD_HASH } from '../_lib/crypto.js';
import { json, sessionCookie, SESSION_TTL_SECONDS } from '../_lib/http.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid-body' }, { status: 400 });
  }

  const identifier = String(body.identifier ?? '').trim();
  const password = String(body.password ?? '');

  if (!identifier || !password) {
    return json({ ok: false, error: 'validation-failed' }, { status: 400 });
  }

  const user = await env.DB
    .prepare('SELECT id, email, username, password_hash, failed_login_count, locked_until FROM users WHERE username = ?1 OR email = ?1 LIMIT 1')
    .bind(identifier)
    .first();

  if (!user) {
    // 帳號不存在：跑一次假的密碼驗證讓耗時跟「帳號存在但密碼錯」一致（見檔案開頭註解）。
    await verifyPassword(password, DUMMY_PASSWORD_HASH);
    return json({ ok: false, error: 'invalid-credentials' }, { status: 401 });
  }

  // 帳號目前被鎖定中：不驗證密碼，直接回覆還要等多久，避免鎖定時間被不斷刷新，
  // 也避免這段時間內繼續做無意義的雜湊運算。
  if (user.locked_until) {
    const lockedUntilMs = Date.parse(user.locked_until);
    if (Number.isFinite(lockedUntilMs) && lockedUntilMs > Date.now()) {
      const remainingMinutes = Math.max(1, Math.ceil((lockedUntilMs - Date.now()) / 60000));
      return json({ ok: false, error: 'locked', remainingMinutes }, { status: 429 });
    }
  }

  const passwordOk = await verifyPassword(password, user.password_hash);

  if (!passwordOk) {
    const newFailedCount = (user.failed_login_count || 0) + 1;
    const shouldLock = newFailedCount >= MAX_FAILED_ATTEMPTS;
    const lockedUntil = shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString() : null;

    await env.DB
      .prepare('UPDATE users SET failed_login_count = ?1, locked_until = ?2 WHERE id = ?3')
      .bind(shouldLock ? 0 : newFailedCount, lockedUntil, user.id)
      .run();
    // 鎖定的當下就把 failed_login_count 歸零，因為鎖定期滿後應該重新給 5 次機會，
    // 而不是「馬上又只剩 0 次」；locked_until 本身才是真正擋登入的依據。

    if (shouldLock) {
      return json({ ok: false, error: 'locked', remainingMinutes: LOCKOUT_MINUTES }, { status: 429 });
    }
    return json({ ok: false, error: 'invalid-credentials' }, { status: 401 });
  }

  // 密碼正確：重設失敗次數、解除鎖定、核發新的 session（等於登入成功）。
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  await Promise.all([
    env.DB.prepare('UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = ?1').bind(user.id).run(),
    env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?1, ?2, ?3)').bind(token, user.id, expiresAt).run(),
  ]);

  return json(
    { ok: true, user: { id: user.id, email: user.email, username: user.username } },
    { status: 200, headers: { 'Set-Cookie': sessionCookie(token) } }
  );
}
