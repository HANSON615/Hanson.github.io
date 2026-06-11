# 🚀 網站上架教學

這是一個完整的前後端分離的記帳應用，包含 AI 理財專員功能。

## 最簡單的上架方式：使用 Railway

### 前置準備
1. 一個 GitHub 帳號
2. 一個 Railway 帳號（可以用 GitHub 登入）

### 步驟 1：創建 GitHub 倉庫
1. 登入 GitHub
2. 點擊右上角的 "+" → "New repository"
3. 給倉庫命名（例如：ai-accounting）
4. 選擇 Public 或 Private
5. 點擊 "Create repository"

### 步驟 2：推送程式碼到 GitHub
在您的電腦終端中執行：
```bash
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的帳號/你的倉庫名.git
git push -u origin main
```

### 步驟 3：在 Railway 上部署
1. 登入 [Railway](https://railway.app)
2. 點擊 "New Project" → "Deploy from repo"
3. 選擇您的 GitHub 倉庫
4. 點擊 "Deploy Now"
5. 部署完成後，點擊 "Generate Domain" 來獲取公開網址

### 步驟 4：設定環境變數
1. 在 Railway 專案中，點擊 "Variables"
2. 添加以下變數：
   - `GEMINI_API_KEY`: 您的 Gemini API Key

### 完成！
現在您的網站已經上架成功了！

## 其他選擇

### 使用 Vercel（僅限前端）
如果您只需要部署前端，可以使用 Vercel，但這個項目有後端，建議使用 Railway。

### 使用 Render
Render 也是一個不錯的選擇，類似 Railway。

## 重要提醒
- 請確保不要將 `.env` 文件 commit 到 GitHub（已經在 `.gitignore` 中了）
- 機密資訊（如 API Key）請使用平台的環境變數功能設定
