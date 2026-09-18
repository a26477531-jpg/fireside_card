-- 新增 role 欄位，做最小可用版本的 RBAC（角色權限）系統用。
-- 套用方式（跟之前的 migration 一樣）：
--   npx wrangler d1 execute fireside-cards-db --file=migrations/0003_add_role.sql --remote
--   本機測試可以先跑一次 --local（但本機模擬資料庫目前是空的，要先補跑過 0001、0002 才有 users 表，
--   非必要可以跳過，直接對正式環境測試）。

-- role 只允許 'user' 或 'admin' 兩種值；新註冊的帳號預設都是 'user'。
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- 把第一個管理員帳號設定好。
UPDATE users SET role = 'admin' WHERE username = 'anthonylam';
