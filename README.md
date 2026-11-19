# 星澔文創網站

這是「星澔文創」影音製作工作室網站，包含前台多頁網站與 Firebase 後台 CMS。

## 檔案

- `index.html`：首頁
- `works.html`：作品案例
- `services.html`：服務項目
- `process.html`：製作流程
- `about.html`：關於我們
- `quote.html`：詢價表單
- `admin.html`：後台 CMS
- `data.js`：預設內容
- `firebase-client.js`：Firebase 讀寫工具
- `site.js`：前台渲染與詢價送出
- `admin.js`：後台內容管理
- `firestore.rules`：Firestore 安全規則

## 後台功能

- 管理員登入
- 網站設定與 SEO 基本資料
- 首頁標題、CTA、Showreel 管理
- 作品新增、編輯、刪除、分類、排序、精選、上架狀態
- 服務項目新增、編輯、刪除、排序、上架狀態
- 製作流程新增、編輯、排序
- 關於我們、團隊、服務領域管理
- 媒體素材 URL 管理
- 詢價資料查看、狀態更新、內部備註與 CSV 匯出
- 首頁每個區塊的標題、說明、按鈕與跑馬文字皆可直接修改
- 合作夥伴 Logo 上傳、排序與顯示控制
- 作品封面直接上傳，YouTube 可播放，Instagram / Facebook 以穩定連結卡呈現
- 影音製作與網站／SEO 延伸服務分開管理
- 各內頁首屏標題集中管理

## GitHub Pages 後台

網站已改用 Firebase 官方 CDN 與明確的專案設定，因此 GitHub Pages 也能讀取 Firestore。請在 Firebase Authentication 的 Authorized domains 加入 `zeronsr2000-ai.github.io`，後台登入才能在 GitHub Pages 網址使用。

第一次登入新版後台後，請按「初始化預設內容」，再開始修改。若要使用圖片上傳，需一併部署 `storage.rules`。

## 連接 GitHub

建立 GitHub repository 後，在此資料夾執行：

```powershell
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPO.git
git branch -M main
git push -u origin main
```

如果要使用 GitHub Pages，進入 GitHub repository：

1. 打開 Settings
2. 選 Pages
3. Source 選 Deploy from a branch
4. Branch 選 `main`，資料夾選 `/root`
5. 儲存後等待 GitHub 產生網站網址

## 部署到 Firebase Hosting

這個專案已經包含 `firebase.json`、`.firebaserc`、`firestore.rules`，可部署到 Firebase Hosting 與 Firestore。

先安裝 Firebase CLI：

```powershell
npm.cmd install -g firebase-tools
```

登入 Firebase：

```powershell
firebase login
```

如果你已經建立 Firebase project，可以直接部署：

```powershell
firebase deploy --only hosting --project YOUR_FIREBASE_PROJECT_ID
```

完整部署：

```powershell
firebase deploy --project starhao-8f494
```

## Firebase Console 需要啟用

1. Authentication：啟用 Email/Password 登入方式，並建立管理員帳號。
2. Firestore Database：建立資料庫，建議選 Production mode，規則會由 `firestore.rules` 部署。
3. Hosting：已設定專案 `starhao-8f494`。

第一次登入後台後，按「初始化預設內容」，將第一版內容寫入 Firestore。

## 每日 SEO 文章助手

GitHub Actions 每天台灣時間 09:17 排程產生一篇繁體中文影音製作教學，也可以在 Actions 手動執行。機器人會送出待審核的 Pull Request，內含獨立 HTML 文章、最新消息連結與 sitemap 更新。合併後由原本的 GitHub Pages 流程發布。若已有文章等待審核，排程會略過當次生成。公開儲存庫的審核 PR 可被其他人看見，請勿在草稿中放入未公開的客戶資料。

啟用方式

1. 到 Settings → Secrets and variables → Actions 新增 repository secret `OPENAI_API_KEY`，使用有 API 額度的金鑰。可另外設定 repository variable `NEWS_MODEL` 指定模型。
2. 到 Settings → Actions → General 確認允許 GitHub Actions 建立 Pull Request。
3. 合併功能後，在 Actions → Daily SEO article 手動執行一次，確認產生文章 PR，再檢查文案與服務連結。

已有人工撰寫的文章時，可用 `python3 scripts/news_bot.py --draft 草稿.json` 產出相同格式。JSON 需要 `slug`、`title`、`description`、`service` 和 `sections`，每一節包含 `heading` 和 `paragraphs`（字串陣列）。支援的服務代號列在程式的 `SERVICES`。
