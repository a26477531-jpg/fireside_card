-- 新增「虛擬金幣」系統：帳號金幣餘額 + 加值紀錄。
-- 這是購買系統的第一步：新註冊帳號預設擁有 60 枚金幣，並開放「加值」
-- （固定金額 50 / 100 / 150），加值流程全程是示意用的模擬扣款頁面，
-- 不會串接任何真實金流，按下「扣款」只會把金幣加進資料庫。
-- 套用方式（跟之前的 migration 一樣）：
--   npx wrangler d1 execute fireside-cards-db --file=migrations/0006_coin_balance.sql --remote
--   本機測試：同一指令加上 --local

-- 金幣餘額。DEFAULT 60 讓「新註冊帳號即享有 60 枚金幣」這件事在資料庫層
-- 就保證成立，不用靠 API 每次記得補寫；既有帳號套用這個 migration 時
-- 也會一次補上 60 枚。
ALTER TABLE users ADD COLUMN coin_balance INTEGER NOT NULL DEFAULT 60 CHECK (coin_balance >= 0);

-- 加值紀錄：記錄每一次「示意加值」（模擬扣款頁按下扣款按鈕）的金額與加值後餘額，
-- 之後如果要在後台查帳號金幣異動歷程，直接查這張表就好，不用重新設計。
CREATE TABLE IF NOT EXISTS coin_transactions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  amount        INTEGER NOT NULL CHECK (amount > 0),
  type          TEXT NOT NULL DEFAULT 'topup',
  balance_after INTEGER NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_id ON coin_transactions (user_id);
