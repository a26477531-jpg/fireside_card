-- 登入失敗鎖定機制需要的欄位。
-- 套用方式（跟 0001 一樣，記得先本機測試再套正式環境）：
--   npx wrangler d1 execute fireside-cards-db --file=migrations/0002_login_lockout.sql --remote
--   本機開發用 --local（或省略）。

-- failed_login_count：連續登入失敗次數，登入成功會重設回 0。
-- locked_until：帳號被鎖定到什麼時候（ISO 時間字串）；沒被鎖定時是 NULL。
--   達到 5 次失敗時，由 functions/api/login.js 設成「現在時間 + 15 分鐘」。
ALTER TABLE users ADD COLUMN failed_login_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TEXT;
