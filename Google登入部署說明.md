# Google 登入與帳號綁定

文件更新：2026-10-07。

保留帳密登入。登入頁與註冊頁提供 Google 登入；已登入會員可綁定 Google，導覽列的使用者名稱會連到登入頁查看綁定狀態。

## 目前部署與驗收狀態

功能已由 `staging` 合併至 `main`，合併提交為 `2f0043b`。Production 與 Preview 已各自建立 OAuth 用戶端、設定三項 Secret 並建立兩張資料表。正式站重新部署後，已確認 `/api/google/status` 回傳 `enabled: true`。

| 驗證項目 | Staging | Production |
|---|---|---|
| OAuth、Secret 與建表設定 | 已完成 | 已完成 |
| 舊會員綁定 Google | 使用者已確認成功 | 尚待真人驗收 |
| 綁定後登出並以 Google 再登入、資料一致 | 使用者已確認成功 | 尚待真人驗收 |
| 新 Google 會員首次建立及再次登入 | 真人測試已跳過，自動測試通過 | 尚待真人驗收 |
| 綁定後原帳密登入 | 尚未回報真人結果 | 尚待真人驗收 |

`enabled: true` 只表示三項設定通過後端存在／格式檢查，不證明 Client secret 正確、授權成功或所有 Google 使用者皆可登入。OAuth Audience 發布狀態尚未確認，公開使用前須於 Google Auth Platform 核對。

## 各環境設定

| 設定 | Production | Preview / Staging |
|---|---|---|
| Git 分支 | `main` | `staging` |
| 網站來源 | `https://firesidecard.com` | `https://staging.firesidecard.com` |
| OAuth 用戶端名稱 | `Fireside Cards Production` | `Fireside Cards Staging` |
| Authorized redirect URI | `https://firesidecard.com/api/google/callback` | `https://staging.firesidecard.com/api/google/callback` |
| D1 資料庫 | `fireside-cards-db` | `fireside-cards-staging-db` |

沿用同一個 Google Cloud 專案，正式及測試使用不同 Web application 用戶端。本版採後端授權碼流程，Authorized JavaScript origins 可留空。Google Auth Platform 設定 Branding、External Audience 與聯絡 Email；登入僅要求 `openid email profile`。測試及公開發布限制以 Google 控制台目前狀態為準。

Cloudflare Pages → Settings → Variables and Secrets，選擇對應環境，將以下三項全部設為 **Secret／加密變數**：

| 名稱 | 值 |
|---|---|
| `GOOGLE_CLIENT_ID` | 該環境的 OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | 該環境的 OAuth Client secret |
| `GOOGLE_AUTH_ORIGIN` | 上表的 HTTPS 網站來源，不加引號、空白或 `/api` |

一般變數與 D1 binding 由 `wrangler.toml` 管理，控制台只開放 Secret；三項都使用 Secret 可供現有後端讀取。登入憑證與自動翻譯的 `GOOGLE_TRANSLATE_API_KEY` 分開管理。憑證不寫入程式、文件或 Git。

Secret 儲存後必須重新部署對應分支。Production 與 Preview 不共享 Secret；任意 preview 網址不支援此登入流程，請使用上表的固定網域。

## 資料庫

`migrations/0010_google_login.sql` 建立：

- `google_accounts`：Google `sub` 與會員 ID 的唯一綁定。
- `google_oauth_states`：單次登入／綁定挑戰、PKCE verifier、原 Session 與 10 分鐘期限。

兩個遠端環境已透過 D1 Console 建立上述資料表，本次部署不需再次建表。未來新增環境時，先完成會員 schema，僅於尚未套用 `0010` 的資料庫執行對應命令：

```powershell
npx wrangler d1 execute fireside-cards-db --file=migrations/0010_google_login.sql --remote
npx wrangler d1 execute fireside-cards-staging-db --file=migrations/0010_google_login.sql --remote --env preview
```

兩行分別對應正式及測試環境。檔案使用 `CREATE TABLE`，不可對既有表重跑；Console 手動建表與 `d1 execute` 不會自動更新 `d1_migrations`。先核對結構，勿直接重跑全部歷史 migration。

可在目標 D1 Console 檢查：

```sql
PRAGMA table_info(google_accounts);
PRAGMA table_info(google_oauth_states);
```

Git 合併或部署不會複製會員與 Google 綁定資料；正式站會員須在正式站綁定一次。

## 帳號規則

- 以 Google 固定 `sub` 識別帳號，不用 Email 自動合併。
- 新 Google 使用者建立一般會員，名稱為自動產生的 `google_` 開頭字串，初始金幣依資料庫預設為 60。可透過忘記密碼流程設定密碼，見 [密碼重設部署說明](密碼重設部署說明.md)。
- Google Email 已有會員時，提示先登入原帳號再綁定。忘記密碼時先重設原會員密碼。
- 綁定前須登入原會員；回來時須維持相同、有效的 Session。綁定不變更會員 ID、原 Email、原密碼、角色、權限或資產。
- 一個會員僅能綁定一個 Google 帳號，一個 Google 帳號僅能綁定一個會員。本版沒有解除或替換綁定。
- 使用單次 state、HttpOnly Cookie 和 PKCE；後端直接向 Google 換取 token 並從 userinfo 取得已驗證 Email 的身分。Google access token 不保存於資料庫、不傳給前端。

## API 與排查

| API | 用途 |
|---|---|
| `GET /api/google/status` | 設定啟用狀態及目前登入者的綁定 Email |
| `POST /api/google/start` | 以 `intent: login` 或 `link` 建立挑戰，返回 Google 授權網址 |
| `GET /api/google/callback` | 消耗挑戰並完成登入或綁定，返回登入頁 |

顯示「Google 登入尚未開放」時，先檢查 status API。`enabled: false` 表示 Client ID／secret 缺少，或 origin 未通過 HTTPS URL 檢查；也要確認修改的是正確環境，且部署是在 Secret 儲存後建立。前端在 API 失敗時也會顯示停用訊息，此時檢查 HTTP 狀態及 Functions 日誌。

若 status 已啟用但 Google 授權失敗，核對正式／測試憑證、redirect URI、Audience 與測試帳號限制。綁定 Email 僅供目前 Session 查詢，不在公開 API 回傳憑證。

## 驗證

```bash
node --test --test-concurrency=1 tests/google-login.test.cjs tests/google-login-browser.test.cjs
```

自動測試涵蓋新會員、既有 Email 衝突、綁定、資產保留、重複／過期 state、取消授權、Session 變更、未驗證 Email、介面語言與手機寬度。瀏覽器測試輸出 `output/google-linked-mobile.png`。2026-10-07 合併前，本機 `npm run ci` 全部 26 項測試通過。

真實上線仍需測試舊會員綁定、Google 再登入、原帳密登入、新會員、取消授權，以及 Google Audience 允許的帳號範圍。核對會員名稱、金幣、收藏、卡牌與購買紀錄，更新上方驗收表。模擬回應不代表正式 Google 授權已驗證。

官方文件：[Google OAuth 後端流程](https://developers.google.com/identity/protocols/oauth2/web-server)、[Cloudflare Pages 設定](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)。
