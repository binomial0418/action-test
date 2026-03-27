# 專案修改紀錄

## 本次變更摘要（2026-03-27）

### 目標
- 改用 Tailwind CSS 寫前端
- 所有外部 JS 檔改為本機，確保斷網可正常使用

---

## 新增檔案

| 檔案 | 說明 |
|------|------|
| `libs/confetti.browser.min.js` | canvas-confetti 1.5.1，取代 jsdelivr CDN |
| `libs/tailwind.min.js` | Tailwind CSS play CDN script，取代 cdn.tailwindcss.com |

---

## 修改檔案

### `game.css`
- 移除所有 Tailwind 可處理的 layout/spacing/color 規則
- 保留 Tailwind 無法處理的部分：
  - CSS 自訂屬性（`--slot`、`--accent`、`--timer-x/y` 等）
  - `.drop-slot::before` / `.drop-slot::after` pseudo-elements（序號與錯誤符號）
  - `@keyframes`（pop、showCongrats、introIn、introOut）
  - `.timer`、`.sidebar` 絕對定位（依賴 CSS 變數）
  - `.intro`、`.btn`、`.step-img`、`.drop-slot` 等 JS 動態建立的元素樣式
- 修正：補回 `.drop-row`、`.fade-out`、`#gameContainer h1`、`#gameContainer .description`
- 修正：新增 `#gameContainer { position: relative }` 確保計時器 absolute 定位不依賴 Tailwind 注入時序
- 修正：`h1` 改為 `#gameContainer h1`（提高 specificity，覆蓋 Tailwind preflight 的 `h1 { font-size: inherit }`）

### `menu.css`
- 移除所有 Tailwind 可處理的規則
- 保留：背景、`backdrop-filter`、`.fade-out`、手機版 `@media`

### `game.js`
- 側欄按鈕圖示從 flaticon CDN PNG 改為內嵌 SVG（重來、選單、首頁）
- 新增：卡片答對飛入 slot 後觸發裝置震動 `navigator.vibrate([40, 30, 60])`

### `menu.js`
- `dish-card` 按鈕改用 Tailwind utility classes
- 卡片內 `<img>` 與 `<span>` 加上 Tailwind classes

### `index.html`
- 引入本機 `libs/tailwind.min.js`
- 移除 `<style>` 內聯 CSS，改為 Tailwind utility classes
- 保留背景、`::before` 漸層、`@keyframes pulse` 於 `<style>` 中（無法純 Tailwind 處理）

### `cook.html` / `act.html`
- 引入本機 `libs/tailwind.min.js`
- 容器、標題、卡片格、返回按鈕、音樂提示改用 Tailwind classes

### `1.html` ～ `10.html`、`a1.html` ～ `a8.html`（共 18 個）
- 引入本機 `libs/tailwind.min.js`
- confetti CDN 改為 `libs/confetti.browser.min.js`
- HTML 結構元素加上 Tailwind classes：
  - `#gameContainer`：`w-[95%] max-w-[1400px] mx-auto my-[42px] p-[33px] relative ...`
  - board wrapper：`flex flex-col gap-[21px]`
  - title-wrap：`flex items-end gap-10`
  - dropZone：`flex flex-col gap-[18px] items-start mt-1.5`
  - stepList：`flex flex-nowrap gap-[18px] justify-center mt-1.5`
  - intro-card、introTitle、introLines、btnStart 改用 Tailwind classes

---

## 外部 CDN 依賴移除清單

| 原 CDN | 取代方式 |
|--------|----------|
| `cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/...` | `libs/confetti.browser.min.js` |
| `cdn.tailwindcss.com` | `libs/tailwind.min.js` |
| `cdn-icons-png.flaticon.com/512/860/860790.png` | 內嵌 SVG（重來圖示） |
| `cdn-icons-png.flaticon.com/512/25/25694.png` | 內嵌 SVG（選單、首頁圖示） |
