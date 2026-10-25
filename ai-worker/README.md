# 農舍 AI 實景渲染 — Cloudflare Worker

現有 GitHub Pages 前端只提供視角截圖、選擇裝潢風格及呼叫本 Worker。AI 影像編輯必須部署在後端，不能把金鑰放在 HTML。

## 部署

在 Cloudflare Workers 建立 Worker，使用此目錄的程式碼部署，或於本機執行：

```bash
cd ai-worker
npm install -g wrangler
npx wrangler login
npx wrangler secret put OPENAI_API_KEY
npx wrangler deploy
```

`OPENAI_API_KEY` 僅存 Cloudflare Secret，不要寫進檔案或 GitHub。請先在 OpenAI 平台設定使用額度和預算警示。API 生成圖片會計費；本專案使用 gpt-image-2.5-flare 的 images/edits API。

部署後，將 `https://<worker-name>.<your-subdomain>.workers.dev/render` 貼進農舍網站的「渲染服務網址」欄位即可。

為降低濫用風險，程式限制瀏覽器 Origin 及請求大小。不過 CORS **並不等於** 身分驗證：任何知道 URL 的使用者仍可使用非瀏覽器工具送出請求並產生費用。**正式對外開放前務必加上 Cloudflare Access、使用者身分驗證與速率限制/額度。** 沒有這些防護時，只建議在受控測試環境使用，或將 AI 後端關閉。

實景圖片可能修改模型中的家具和門窗細節；尺寸請以 3D 編輯器的實測模型為準。
