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
