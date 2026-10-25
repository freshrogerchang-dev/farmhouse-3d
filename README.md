# 農舍 3D 格局設計室（38 坪主屋 + 車庫另計）

本網站為依手繪草圖建立的可編輯概念模型，非正式建築施工圖。

## GitHub Pages 發佈

1. 在 GitHub 新增 **Public** repository，名稱建議 `farmhouse-3d`，勾選 Initialize with README。
2. 將本 ZIP 解壓縮，將 `index.html`、`README.md`、`.nojekyll` 及 `.github/workflows/pages.yml` 上傳到 repo 的 **main** 分支（注意 `.github` 是隱藏資料夾）。
3. 在 repo 的 **Settings → Pages → Build and deployment → Source** 選 **GitHub Actions**。
4. 開啟 **Actions → Deploy Farmhouse 3D to GitHub Pages** 確認部署成功。
5. 預期網址 `https://<你的帳號>.github.io/farmhouse-3d/`，實際以 Settings → Pages 的 published URL 為準。

網頁透過 esm.sh 載入 Three.js，首次使用需網路連線。設計變動只有在使用「下載設計 JSON」儲存後才可保留；網站不會自動同步到 GitHub。

## 預設尺寸

- 住宅：10.05 × 12.5 公尺 ≈ 38.0 坪（外框面積；非室內淨面積）。
- 車庫：3.5 × 12.5 公尺 ≈ 13.2 坪（另計）。

## 提醒

這是網頁示範模型，房間佈局和門窗位置需進一步核對原圖，並由專業建築師確認法規、結構與建照適用性。