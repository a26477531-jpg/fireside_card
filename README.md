# 爐邊卡牌模板

以爐石卡牌庫的版面配置為參考，用原生 HTML、CSS、JavaScript 製作。這是本地交付的獨立模板，沒有發佈到網路，也未下載、引用或熱連結暴雪圖片、字型、程式碼及 API。所有圖片引用均來自原工作資料夾。

## 開啟

直接雙擊 `index.html` 即可，無須安裝套件。也可在本資料夾執行 `node serve.cjs`，開啟 http://127.0.0.1:4173。

## 接著修改

四語功能的資料格式、更新指令與練習請看 [多語卡牌教學](多語卡牌教學.md)。卡牌名稱與規則現在請修改 `data/card-translations.csv`，再執行 `node scripts/build-translations.cjs` 產生網站使用的翻譯。

- `index.html`：導覽、橫幅、篩選列、卡牌庫及詳情視窗結構。
- `index.css`：顏色、字型、桌面與手機版面。主要色彩變數放在最上方。
- `app.js`：搜尋、組合篩選、排序、分頁、格狀／條列檢視與詳情視窗。
- `cards-data.js`：31 張卡牌的共用數值、圖片、系列與文字框位置，以及中文備援和機制篩選資料。顯示的名稱、技能翻譯以 CSV 為準。
- `banner/01.jpg`：目前橫幅背景。可在 CSS 的 `.hero:before` 換圖。
- `index.original.html`、`index.original.css`：修改前的檔案備份。

卡牌資料欄位：`id`（唯一字串）、`name`、`subtitle`、`mana`、`attack`、`health`、`image`、`collection`、`abilities`（包含 `title`、`text` 的陣列）。新增資料可以複製既有項目。新增系列時需同步修改 HTML 的系列下拉選單和分頁按鈕。

目前使用你更新的 31 張完整資料與 `cards-clean-layout-31` 圖片。卡面既有數值是圖片的一部分，修改資料數值不會更改圖片上的數字，需同步提供新圖。

卡牌網格與詳情卡面顯示 `rulesText` 的完整技能標題與效果，保留段落換行；缺少此欄位時由 abilities 組合。再次點選同一法力費用會取消該篩選。所有篩選共同作用，空結果可清除篩選。每頁 15 張，可調整 `app.js` 的 `PAGE_SIZE`。

`prepare-data.cjs` 現為唯讀檢查工具。執行 `node prepare-data.cjs` 可檢查卡牌 ID、圖片與規則是否完整，不會覆寫資料。

## 重現範圍

保留參考站的深色導覽、主題橫幅、系列分頁、紅金篩選列、法力按鈕、羊皮紙卡牌區與瀏覽流程。未製作官方帳號、商店、套牌建構器或官方資料同步。沒有使用官方圖像，因此不是像素完全相同的複製品。

## 橫幅輪播

使用 `banner/01.jpg`、`02.jpg`、`03.jpg`，每 5 秒自動切換，含左右箭頭、圓點、張數與播放／暫停按鈕。圖片等比例完整顯示。滑鼠停留時暫停，離開後繼續；鍵盤移入後停止，需按播放重新啟動。背景分頁停止計時；系統設定減少動態效果時預設不自動播放。可在 `app.js` 的 `INTERVAL` 修改間隔（毫秒）。新增圖片需同步增加 `index.html` 的圖片與圓點。

目前已以輪播取代原 `.hero:before` 的靜態背景，換圖請修改 HTML 的 `.banner-slide` 圖片路徑。

輪播尺寸更新：高度為 `clamp(220px, 30vw, 400px)`，圖片使用 `object-fit: cover` 居中填滿，不留空白邊；超出比例的部分會裁切。控制列疊在圖片底部，不另佔高度。可在 `index.css` 的 `.banner-slides` 調整高度。

## 每張卡牌的名稱框校正

31 張卡牌已逐張目視定位，並用瀏覽器檢查實際文字疊合效果。`cards-data.js` 中每張的 `nameLayout` 保存名稱框的 `centerX`、`centerY`、`width`、`height`（相對整張圖的百分比）與 `fontSize`（相對卡寬的百分比）。名稱在框內水平與垂直置中，列表卡圖和詳情大圖共用設定；`color` 可覆寫字色。

這是針對目前圖片的一次性視覺校正，不是執行時自動辨識。日後換成不同版面的卡圖，可個別修改 `nameLayout`，不用改動其他卡牌。`.layout-review` 保存此次核對用的局部圖與檢視頁面。

## 規則文字避開裝飾

每張卡牌的 `rulesLayout` 記錄規則區起點 `top`、高度 `height`、兩側裝飾開始位置 `notchStart` 和保留寬度 `sideInset`（均為百分比，後兩者相對規則區）。文字上半部使用較寬空間，下半部自動繞開徽章與裝飾。保留 3.7cqw 字體，以縮減行距、技能間距及個別區域設定處理重疊，未刪減規則內容。

已逐張檢查 31 張的瀏覽器疊合效果，並確認卡寬 300px 與 400px 共 62 組排版沒有超出所設定的文字安全區。日後新增更長規則或更換圖片，請重新檢查對應範圍。

## 帳號收藏

登入後在卡牌詳情按「加入收藏／取消收藏」，卡牌庫勾選「只看收藏」可與搜尋及其他篩選一起使用。收藏依登入帳號儲存在 D1 的 favorites 表（已有 migrations/0001_init.sql），不是購買或持有卡牌。

API：GET /api/favorites 列出自己的卡牌 ID；PUT /api/favorites 加入、DELETE /api/favorites 取消，寫入 body 為 {"cardId":"01"}。帳號 ID 一律由 Session 取得；重複加入不會建立重複資料。新增卡牌時須同步 functions/_lib/card-ids.js。

node serve.cjs 僅提供靜態預覽，實際帳號收藏需在已套用資料表的 Cloudflare Pages Functions／D1 環境驗證。本機自動測試：node --test tests/favorites.test.cjs。
