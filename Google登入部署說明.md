# Google 登入與帳號綁定

保留帳密登入。登入頁與註冊頁提供 Google 登入，已登入會員可綁定 Google。導覽列的使用者名稱可進入登入頁管理綁定。

## 一次性設定

1. 在 Google Cloud Console 建立專案，設定 Google Auth Platform 的 Branding、Audience 與 Data Access。僅要求 `openid email profile`。測試模式須加入測試使用者；公開使用時依 Google 控制台要求切換發布狀態。
2. 建立類型為「Web application」的 OAuth client。Authorized redirect URI 設為 `https://firesidecard.com/api/google/callback`。若使用 staging，另外建立測試用 client，設定 `https://staging.firesidecard.com/api/google/callback`。
3. Cloudflare Pages 的 Production 環境設定：
   - `GOOGLE_CLIENT_ID`：Google 提供的 Client ID。
   - `GOOGLE_CLIENT_SECRET`：Google 提供的 Client secret，設為加密 Secret；不要寫入 Git 或前端。
   - `GOOGLE_AUTH_ORIGIN`：`https://firesidecard.com`。
   Preview 環境獨立設定測試 client、secret 與 `https://staging.firesidecard.com`。任意 preview 網址不提供登入；網域須與設定完全相符。
4. 先套用資料庫 migration，再部署程式：

```powershell
npx wrangler d1 execute fireside-cards-db --file=migrations/0010_google_login.sql --remote
npx wrangler d1 execute fireside-cards-staging-db --file=migrations/0010_google_login.sql --remote --env preview
```

未提供 Google 環境設定時，Google 按鈕停用，帳密登入維持可用。已提供設定但尚未套用 migration 時，Google 功能無法運作。

## 帳號規則

- 以 Google 的固定 `sub` 識別帳號，不用 Email 自動合併。
- 新 Google 使用者建立一般會員，使用自動產生的 `google_` 名稱，金幣沿用資料庫預設值。可透過既有忘記密碼流程設定帳密登入用的密碼。
- Google Email 已有會員時，提示先登入原帳號再綁定。忘記密碼時先使用原本的密碼重設功能。
- 綁定前須登入原會員；回來時必須仍是相同且有效的 Session。綁定不變更會員 ID、原 Email、原密碼、權限或資產。
- 一個會員僅能綁定一個 Google 帳號，一個 Google 帳號僅能綁定一個會員。本版不提供解除或替換綁定。
- 使用單次、10 分鐘有效的 state、HttpOnly Cookie 和 PKCE，後端直接向 Google 換取 token 並讀取已驗證 Email 的身分資料。Google access token 不保存於資料庫、不傳給前端。

## 上線驗收

使用真實 Google 測試新會員登入、舊会员綁定、登出後 Google 再登入、同 Email 提示、不同帳號重複綁定、取消授權及手機操作。核對綁定前後會員 ID、收藏、持有卡牌與金幣不變。程式自動測試使用模擬 Google 回應，無法取代實際 OAuth client、網域與發布設定的驗收。

官方流程：https://developers.google.com/identity/protocols/oauth2/web-server
