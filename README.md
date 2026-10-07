# Fireside Cards｜爐邊卡牌

文件更新：2026-10-07。

Fireside Cards 是一個以卡牌蒐集與瀏覽為主題的 Web Application，
使用原生 HTML、CSS、JavaScript 開發，並透過 Cloudflare Pages、Pages Functions 與 Cloudflare D1 建構前後端功能。

網站已部署上線：

[正式站](https://firesidecard.com/) · [Staging](https://staging.firesidecard.com/)

本專案最初以卡牌資料庫介面作為練習起點，後續逐步擴充會員、收藏、商城、虛擬貨幣、卡牌持有、管理後台、多語系與資料庫等功能。

> 本專案未使用暴雪官方程式碼、API、字型或官方圖片資源。
> 卡牌內容與網站功能皆為個人練習與作品集用途。

---

## 主要功能

### 卡牌資料庫

提供卡牌瀏覽、搜尋、排序、系列、法力與其他條件的組合篩選功能。

卡牌可使用格狀與列表方式瀏覽，點擊卡牌後可查看完整卡牌資訊與技能文字。

正式環境的卡牌資料由 Cloudflare D1 提供，前端透過 `/api/catalog` 取得資料。

---

### 響應式介面

支援桌面與行動裝置版面。

卡牌、篩選列、導覽、商城與會員相關頁面皆依不同螢幕寬度調整顯示方式。

---

### 四語系

前台支援：

- 繁體中文
- English
- 日本語
- 한국어

使用者切換語言後，卡牌名稱、技能、介面與商城內容可依現有翻譯資料顯示。

語言切換不會即時呼叫翻譯 API，而是讀取已保存並經確認的翻譯資料。

---

### 會員系統

Google 登入與既有會員綁定已合併至 `main` 並部署正式站。Production 與 Preview 已各自設定 OAuth 用戶端、三項 Secret 與 Google 資料表；正式站 `/api/google/status` 已確認回傳 `enabled: true`。Staging 已實際驗證舊會員綁定及 Google 再登入，正式站真人綁定與再登入仍待驗收。操作、設定與驗收紀錄見 [Google登入部署說明](Google登入部署說明.md)。

提供：

- 註冊
- 登入
- Google 登入與登入後綁定
- 忘記密碼與郵件重設
- Session 驗證
- 帳號狀態顯示

會員登入後可使用收藏、商城、我的卡片等功能。

綁定 Google 沿用原會員 ID，保留密碼、權限、收藏、金幣與卡牌。相同 Email 不會自動合併帳號；既有會員需先用帳密登入再綁定。Google 新會員可使用忘記密碼流程設定密碼，詳見 [密碼重設部署說明](密碼重設部署說明.md)。

---

### 我的收藏

登入會員可以將卡牌加入或移除收藏。

收藏資料保存於 Cloudflare D1，
不同使用者的收藏彼此獨立。

收藏與實際持有的卡牌為兩套不同的資料，不會互相影響。

---

### 商城與卡牌購買

網站包含卡牌組合包商城。

會員可使用網站內的虛擬金幣購買卡牌組合包。

購買流程會在後端驗證：

- 登入狀態
- 商品是否存在
- 商品版本
- 商品價格
- 卡牌狀態
- 使用者金幣餘額

購買成功後會扣除虛擬金幣，並將卡牌加入會員的持有卡牌資料。

同一張卡牌可重複取得並累計數量。

目前金幣與加值功能僅為作品集模擬機制，沒有串接真實金流。

---

### 我的卡片

登入會員可以在「我的卡片」頁面查看已取得的卡牌。

支援：

- 卡牌數量
- 搜尋
- 卡牌詳情
- 收藏與取消收藏

已購買卡牌與收藏資料分開保存。

---

### 交易紀錄

登入玩家可從導覽列的「購買紀錄」查看自己的訂單（`purchases.html`），包含訂單編號、購買時間、組合包、數量、總金額、狀態及當時內含的卡牌。每頁顯示 25 筆，依購買時間由新到舊排列，支援前台四語系。

`GET /api/purchases?page=1` 依登入 Session 限定查詢本人訂單，不接受指定其他玩家；商品與卡牌名稱使用歷史快照。此功能沿用既有資料表，需已套用至 `0008_order_numbers.sql`，不需新增 migration。

購買行為會建立訂單與交易紀錄。

後端保存購買當下的商品、卡牌與價格資料，
避免日後商品修改後影響歷史訂單。

交易使用固定的可讀訂單編號，
並保留內部 UUID 作為資料關聯。

---

## 管理後台

專案包含獨立的管理後台。

管理員可管理：

- 卡牌
- 卡牌上架狀態
- 商品／組合包
- 商品價格
- 商品內含卡牌
- 交易紀錄
- 多語翻譯
- 翻譯人工確認

管理 API 會驗證登入 Session 與操作權限，
一般會員與未登入使用者無法呼叫管理功能。

---

## 多語翻譯工作流程

新增卡牌或商品時，可指定原文語言：

- 繁體中文
- English
- 日本語
- 한국어

管理後台可透過 Google Cloud Translation API
自動產生另外三種語言的初步譯文。

自動翻譯完成後不會直接視為正式內容，
而是標記為待人工確認。

管理員可以逐語言：

1. 檢查自動翻譯
2. 手動修改內容
3. 確認翻譯
4. 完成所有語言確認後再上架

翻譯 API Key 僅存在 Cloudflare 後端 Secret，
不會寫入前端 JavaScript 或 Git Repository。

---

## 管理後台語言

管理後台目前支援：

- 繁體中文
- English

後台語言切換僅影響管理介面，
不會修改卡牌原文或既有翻譯資料。

---

## 首頁輪播

首頁包含主題橫幅輪播。

輪播內容目前由 `promotions-data.js` 與 `promotions.js` 管理，
而不是直接將固定圖片寫死在 HTML。

支援：

- 自動播放
- 上一張／下一張
- 播放與暫停
- 圖片張數顯示
- 響應式顯示

---

## 卡牌版面系統

每張卡牌具有各自的文字版面設定。

`nameLayout` 用於控制卡牌名稱的位置與尺寸。

`rulesLayout` 用於控制技能文字區域，
避免文字與卡面徽章或裝飾元素重疊。

卡牌列表與卡牌詳情共用相同的版面資料。

既有 31 張卡牌使用 `card-template.json` 的統一範本，圖片存放於 `cards-unified-31/`，由 `card-artwork.js` 共用繪製。支援滑鼠懸停傾斜、詳情頁滑鼠／觸控拖曳和鍵盤旋轉；降低動態效果偏好會停用自動懸停傾斜。

---

## 技術架構

### Frontend

- HTML5
- CSS3
- JavaScript
- Responsive Web Design
- DOM / Event Handling
- Fetch API

### Backend

- Cloudflare Pages Functions
- REST API
- Session Authentication

### Database

- Cloudflare D1
- SQLite
- Database Migrations

### Deployment

- Cloudflare Pages
- Custom Domain
- Production / Preview Environment

### Development

- Git
- GitHub
- Node.js
- Wrangler
- Node Test Runner

### External Service

- Google Cloud Translation API
- Google OAuth 2.0 / OpenID Connect（登入與綁定）
- Resend（密碼重設郵件）

---

## Production / Staging

正式環境與測試環境使用不同的 Cloudflare D1 資料庫。

Production：

`fireside-cards-db`

Preview / Staging：

`fireside-cards-staging-db`

藉此避免測試資料影響正式網站。

`main` 用於 Production，`staging` 用於 Preview。兩個環境的會員、Google 綁定、收藏、卡牌、訂單與 Secret 分開管理；合併程式不會複製上述資料。Secret 更新後需重新部署對應環境。

專案一般變數及 D1 binding 由 `wrangler.toml` 管理。Google 登入的 `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`GOOGLE_AUTH_ORIGIN` 目前全部使用控制台 Secret；翻譯使用獨立的 `GOOGLE_TRANSLATE_API_KEY`，兩者不能互換。

---

## 資料來源

正式環境的卡牌、翻譯、商品、帳號、收藏與交易資料主要存放於 Cloudflare D1。

`cards-data.js`、`translations-data.js` 與
`data/card-translations.csv`
目前主要作為：

- 初始資料
- 開發工具
- 備援資料
- 舊版相容

管理後台修改 D1 資料時，
這些本機檔案不會自動同步更新。

---

## 本機開發

若只需要查看部分靜態前端頁面，可以執行：

```bash
node serve.cjs
```
再開啟：

```text
http://127.0.0.1:4173
```

但 `serve.cjs` 只提供靜態預覽。

會員、收藏、商城、管理後台與其他需要 Cloudflare Pages Functions / D1 的功能，應使用 Wrangler：

```bash
npx wrangler pages dev .
```

本機 Wrangler 環境會使用本機 SQLite 模擬 Cloudflare D1。

---

## 資料庫 Migration

專案的資料表版本放在：

```text
migrations/
```

Cloudflare D1 migration 不會因為 Git Push 自動執行。

部署新資料庫功能時，需自行確認對應 migration 已套用。

Production 與 Preview / Staging 資料庫需分別管理。

目前 migration 檔案為 `0001` 至 `0010`，其中 `0009_password_reset.sql` 提供密碼重設，`0010_google_login.sql` 提供 Google 綁定與 OAuth state。不要將最新檔案編號當成遠端資料庫已套用的證明。

本專案曾透過 `d1 execute --file` 與 D1 Console 手動套用 SQL；這些操作不會自動同步 `d1_migrations` 紀錄。既有環境應先核對資料表、欄位與 migration 紀錄，再執行缺少的 SQL，避免重跑 `ALTER TABLE` 或已建立的資料表。

---

## 測試

### GitHub Actions CI

工作流程位於 `.github/workflows/ci.yml`，每次 push、Pull Request 或手動執行時，會使用 Node.js 24：

1. 透過 `npm ci` 安裝鎖定版本的測試依賴。
2. 安裝 Playwright Chromium 與 Linux 系統依賴。
3. 檢查前端、Functions、工具與測試的 JavaScript 語法。
4. 執行 `tests/*.test.cjs` 的全部測試，涵蓋 API、SQLite migration、翻譯、卡牌版面及瀏覽器操作。

本機執行相同檢查：

```bash
npm ci
npx playwright install chromium
npm run ci
```

請使用 Node.js 24；資料庫測試需要內建的 `node:sqlite`。瀏覽器預設使用 Playwright Chromium，也可透過 `PLAYWRIGHT_CHANNEL=msedge` 指定已安裝的 Edge。每個測試檔有 120 秒上限，整個 CI 工作有 15 分鐘上限。

部分瀏覽器測試透過環境變數輸出截圖，例如 `PROMOTIONS_SCREENSHOT` 或 `PURCHASE_HISTORY_SCREENSHOT`；Google 瀏覽器測試固定輸出 `output/google-linked-mobile.png`。

CI 使用記憶體 SQLite 與模擬的翻譯、Google OAuth 和郵件服務，不需要 Cloudflare、Google 或 Resend Secrets，也不會部署網站或套用遠端 migration。現有 Cloudflare 自動部署不會因新增 CI 就自動等待測試結果。

2026-10-07 合併 Google 功能前，本機 `npm run ci` 已完成 81 個 JavaScript 檔案語法檢查及 26 項測試，全部通過。這是當次本機結果，並非 Google 真實授權或 GitHub Actions 結果。

提交並推送這些設定後，可在 GitHub 儲存庫的 **Actions → CI** 查看結果。若要要求 PR 通過測試才能合併，請在目標分支的 Ruleset / Branch protection 中，將 `Syntax and tests` 設為必要檢查；工作流程本身不會啟用分支保護。

專案包含後端與功能測試，放置於：

```text
tests/
```

測試範圍包含：

- 帳號與權限
- Google OAuth state、PKCE、綁定衝突、Session 變更與資產保留
- 密碼重設、憑證到期及 Session 撤銷
- 收藏
- 卡牌購買
- 金幣扣款
- 重複交易防護
- D1 資料寫入
- 管理 API
- 多語翻譯
- 商品翻譯
- 手機版流程

部分測試使用 Node.js Test Runner 與 SQLite，模擬實際 API 與 D1 行為。

---

## 專案結構

```text
fireside_card/
│
├── index.html
├── index.css
├── app.js
│
├── login.html
├── register.html
├── account.js
├── google-login.js
├── google-login.css
├── forgot-password.html
├── reset-password.html
├── password-recovery.js
│
├── favorites.html
├── favorites.js
│
├── shop.html
├── shop.js
├── topup.html
├── my-cards.html
├── my-cards.js
│
├── admin.html
├── admin.js
├── admin-i18n.js
│
├── i18n.js
├── catalog-client.js
├── translation-workflow.js
│
├── promotions-data.js
├── promotions.js
│
├── functions/
├── migrations/
├── tests/
├── data/
│
└── wrangler.toml
```

---

## 相關文件

更詳細的開發與部署說明：

- [管理後台說明](管理後台說明.md)
- [Google 登入部署說明](Google登入部署說明.md)
- [密碼重設部署說明](密碼重設部署說明.md)
- [多語卡牌教學](多語卡牌教學.md)
- [購買功能部署說明](購買功能部署說明.md)
- [輪播維護說明](輪播維護說明.md)
- [卡牌統一範本說明](卡牌統一範本說明.md)

---

## 專案狀態

本專案仍持續開發與改善中。

目前正式網站：

[https://firesidecard.com/](https://firesidecard.com/)

GitHub：

[https://github.com/a26477531-jpg/fireside_card](https://github.com/a26477531-jpg/fireside_card)
