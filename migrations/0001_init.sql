-- 初始化帳號系統所需的資料表。
-- 在 Cloudflare 建好 D1 資料庫並綁定到 Pages 專案後，用以下指令套用：
--   npx wrangler d1 execute <D1_DATABASE_NAME> --file=migrations/0001_init.sql --remote
-- 本機開發（wrangler pages dev）時則用 --local（或省略 --remote，預設本機）。

-- 使用者帳號。email／username 都設定唯一且不分大小寫比對（COLLATE NOCASE），
-- 避免 Abc@Example.com 與 abc@example.com 被當成兩個不同帳號。
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL COLLATE NOCASE,
  username      TEXT NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique    ON users (email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users (username);

-- 登入用的 session token（簡易版：註冊/登入成功後核發，存在 HttpOnly cookie 裡）。
-- 之後如果要做「登入」頁面，可以直接沿用這張表，不用重新設計。
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);

-- 預留給日後「個人收藏卡片」功能：每個使用者收藏的卡牌 id（對應 cards-data.js 的 id 欄位，例如 "01"）。
-- 目前還沒有任何功能會寫入這張表，先建起來以免日後又要跑一次 migration。
CREATE TABLE IF NOT EXISTS favorites (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  card_id    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (user_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites (user_id);
