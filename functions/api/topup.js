// POST /api/topup
// Body: { amount: 50 | 100 | 150 }
// 加值金幣：這是「示意用」的模擬付款流程 —— 前端的扣款頁面欄位全部
// 唯讀、不會真的收集付款資訊，按下「扣款」按鈕呼叫這支 API 之後，
// 只會把金幣加進使用者帳號，不會有任何真實金流發生。
// 金額固定只能是 50 / 100 / 150（伺服器端重新驗證一次，不能只信任前端）。
import { authenticate } from '../_lib/middleware.js';
import { json } from '../_lib/http.js';

const ALLOWED_AMOUNTS = new Set([50, 100, 150]);

async function topup({ request, env, data }) {
  // CSRF：只接受同源的請求（跟 favorites.js 用一樣的檢查方式）。
  if (request.headers.get('Origin') && request.headers.get('Origin') !== new URL(request.url).origin) {
    return json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid-body' }, { status: 400 });
  }

  const amount = Number(body?.amount);
  if (!ALLOWED_AMOUNTS.has(amount)) {
    return json({ ok: false, error: 'invalid-amount' }, { status: 400 });
  }

  const userId = data.user.id;

  // 用 batch 把「加金幣」「寫加值紀錄」「查最新餘額」包在同一個交易裡，
  // 避免併發請求時金幣被算錯（跟 favorites.js／admin 那邊用 batch 的
  // 精神一樣：能用一次交易做完的事，就不要分成好幾個各自獨立的請求）。
  const results = await env.DB.batch([
    env.DB.prepare('UPDATE users SET coin_balance = coin_balance + ?2 WHERE id = ?1').bind(userId, amount),
    env.DB.prepare(
      `INSERT INTO coin_transactions (user_id, amount, type, balance_after)
       VALUES (?1, ?2, 'topup', (SELECT coin_balance FROM users WHERE id = ?1))`
    ).bind(userId, amount),
    env.DB.prepare('SELECT coin_balance FROM users WHERE id = ?1').bind(userId),
  ]);

  const row = results[2].results[0];
  return json({ ok: true, amount, coinBalance: row.coin_balance });
}

export const onRequestPost = [authenticate, topup];
