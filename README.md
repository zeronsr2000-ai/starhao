# 公司網站

這是一個可部署到 GitHub Pages 的靜態公司網站。

## 檔案

- `index.html`：網站內容與區塊
- `styles.css`：版面、顏色與響應式設計
- `script.js`：手機選單與導覽列互動

## 需要替換的內容

- 公司名稱：目前使用「星曜企業」
- 聯絡信箱：目前表單使用 `hello@example.com`
- 首頁文案、服務內容、數據與案例
- Logo 或品牌色
- 圖片可替換為公司實景、產品或團隊照片

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

這個專案已經包含 `firebase.json`，可以直接部署靜態網站。

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

如果還沒有 Firebase project，先到 Firebase Console 建立專案，再把 Project ID 填進上面的指令。
