# Farmhouse 3D — A2 擬真建築模型強化實作規格書

版本：A2 Spec v1.0（規劃文件，尚未實作）
日期：2026-10-26
目標專案：freshrogerchang-dev/farmhouse-3d
主要程式：blocks.html；舊版 index.html 與 ai-worker 保留。

## 1. 目標與驗收定義

以「可靠展示整體配置」優先於生成照片。所有牆面、門窗、家具、車庫、拉門都以同一份可編輯設計資料生成 2D／3D；3D 輸出 PNG 不使用生成式 AI 改寫幾何。使用者可查看「鳥瞰全屋／剖視模型／正上方」，並在切換視角時保持家具座標一致。

主要情境：兩臥室共用一衛浴；左下彈性主臥／工作室有拉門；右側第二衛浴保留；開放客餐廳；右上廚房；車庫接廚房且有車；洗衣儲藏與車庫相鄰。不得在視覺提升中更動此預設格局。

A2 是概念級建築展示，不是建築法規或施工圖檢核，不承諾尺寸及構造可直接施工。

## 2. 已確認的現況

* blocks.html 使用 Three.js；房間及家具儲存在 localStorage key farmhouse-blocks-v2，可匯入／匯出 JSON。
* 當前主要函式：alignedEdges()、wall3D()、build3D()、finish3D()、cameraPreset()、saveLocal()。
* 已有基本的陰影、ACES tone mapping、三種相機視角、自動家具配置及房間門窗工具；目前仍以 BoxGeometry 示意多數物件。
* Worker AI 是局部空間風格輔助；A2 主模型不可依賴其輸出。

## 3. A2 必做功能（P0）

### A2-01：拆分模組與資料正規化
將 blocks.html 中資料／幾何／材質／渲染／UI 分為具清楚責任的 ES modules（至少 src/model、src/geometry、src/materials、src/assets、src/renderer、src/ui）。保持既有網站網址 /blocks.html 與 GitHub Pages 靜態部署。建立 schemaVersion:4 JSON；舊版 version:1–3 自動轉換，舊 localStorage 只讀匯入一次，勿無聲覆寫；保留匯出備份。房間、開口、家具需有穩定 ID，避免目前門窗靠牆段浮點座標比對而在移動房間後遺失。

### A2-02：確定性建築幾何
統一長度單位公尺、Y 為高度、X/Z 為平面。牆段由相鄰房間邊界合併；每個共用牆只建立一次。開口使用 wallId、offset、width、height、sillHeight；在牆體真正切出門窗洞（以拆分牆段或合併幾何方案），不得僅將整面牆透明。相鄰廚房與車庫建立實際通道，左下工作室採多片式可開關拉門；保留外牆。遇到互相重疊／不連通格局要提示，而非改動使用者座標。

### A2-03：材質庫與授權
建立可選 MaterialPreset：wood_floor、tile_bath、stone_countertop、plaster_wall、garage_concrete、metal_frame、glass_clear、glass_frosted、upholstery。優先挑選經核對 CC0 授權的 Poly Haven／ambientCG 素材；素材隨專案保存路徑及 licence/source metadata，禁止熱連無授權資產。採 PBR baseColor、normal、roughness，貼圖需有真實尺寸 repeat；color map 指定 sRGB。弱裝置先用 1K 貼圖、fallback 純色標準材質。玻璃使用 MeshPhysicalMaterial/物理透光（視效能降級）。

### A2-04：家具／汽車模型
資產管線採 GLB/glTF，經 GLTFLoader 載入與尺寸歸一化；GLB 失敗使用現有簡化幾何 fallback。第一批最少 8 類：沙發、茶几、六人桌椅、床、書桌、冰箱、廚房中島／櫥櫃、汽車。附加洗衣機、衛浴設備、儲物架作 P1。模型錨點為地面中心；所有家具必須按家具資料座標與旋轉角度排列，不得載入後隨機生成第二套家具。汽車長寬要能與車庫尺寸比對，並保留輪胎、車窗、車身辨識度。

### A2-05：門窗結構
室內單開門：框、門片、鉸鏈側，開啟角度示意；衛浴門可設定向內外開。工作室拉門：上軌、至少兩片門、收合位置，開關時通道淨寬改變。玻璃窗：框、玻璃、窗台，含一般窗／衛浴高窗／客廳大片窗。車庫門有獨立可視化（切勿與廚房連通門混淆）。開口不得被家具模型完全遮擋；保留人工位置調整。

### A2-06：燈光、環境與視角
保留太陽光、環境光、PCFSoftShadowMap、ACES tone mapping。增加可開關的客廳／餐廳／廚房／工作室示意燈，低階裝置關閉過多即時光源。可選日間暖光／中性光兩種；加入建築底座、合理地面但不可蓋過主要格局。相機預設：鳥瞰（可看屋頂）、剖視（移除屋頂）、正上方（orthographic 建議）；相機目標及遠近裁切依模型包圍盒計算。輸出 PNG 時強制等待至少一幀完成並保留真實長寬比。

## 4. 非必要但值得排程（P1）
* 可選 2K 貼圖、HDRI / PMREM、接觸陰影、LOD 或 instancing。
* 家具資產選擇器與材質面板；各房間地坪可套用不同材質。
* 以 GLB 導出整棟模型供 Blender 使用；需要記錄模型授權。
* 網頁分享連結或版本快照；不得將 AI 密碼加入 URL／匯出檔。
* 自動 QA：門口暢通、拉門開關、車庫車輛包絡尺寸、浴廁門可達性。

## 5. 建議資料結構

```json
{
  "schemaVersion": 4,
  "units": "m",
  "rooms": [{"id":"bed-1","type":"bed","name":"臥室一","x":0.5,"z":0.5,"w":4,"d":3.5,"floorMaterial":"wood_floor"}],
  "walls": [{"id":"wall-1","x1":4.5,"z1":0.5,"x2":4.5,"z2":4.0,"height":2.7,"thickness":0.14}],
  "openings": [{"id":"opening-1","wallId":"wall-1","type":"hingedDoor","offset":1.3,"width":0.9,"height":2.1,"sillHeight":0}],
  "furniture": [{"id":"item-1","type":"bed","assetId":"bed-double-01","x":2.5,"z":2.2,"rotation":0}],
  "studioSlidingDoor": {"openingId":"opening-studio","open":true},
  "view": {"mode":"dollhouse","lighting":"daylight"}
}
```

上例僅為示意，不可直接覆寫現存完整房間配置。牆、開口可在讀取 rooms 時重新生成，但 opening 必須可透過 stable ID 與牆保持關聯。

## 6. 工程任務與依賴

1. A2-P0.1 備份、分層與資料 migration；完成回歸匯入匯出測試。
2. A2-P0.2 修正牆體、開口與拉門幾何；驗證廚房進車庫通道、右側第二衛浴。
3. A2-P0.3 素材清單、授權、PBR 材質與 fallback。
4. A2-P0.4 GLB loader、模型尺寸正規化、車輛與核心家具。
5. A2-P0.5 燈具、相機切換、剖視與 PNG。
6. A2-P0.6 行動裝置效能、UI/UX 回歸與部署驗收。

## 7. 測試及完成標準

* 保存／重新整理／匯入 JSON 後，房間、門窗、家具的座標及型別一致；支援舊版 JSON。
* 3D 裡房間牆線與 2D 一致；相鄰牆不得重複生成；門洞不能被牆體填滿。
* 拉門開啟／關閉後，3D 能呈現不同門片位置，不移動房間及家具。
* 家具模型在對應房間，汽車仍是汽車；GLB 載入失敗時網站仍可操作。
* 鳥瞰、剖視、正上方切換正常；輸出 PNG 與畫面相符，不需呼叫 AI。
* 手機基本可操作；效能目標：中階桌機 30 FPS 以上，行動裝置 20 FPS 以上（以指定樣機測量，非保證）；必要時提供省資源模式。
* 無跨來源素材權限錯誤；素材來源與授權隨 repo 記錄。
* 透過 GitHub Pages workflow 部署並實測現網；僅 CI 綠燈不足以宣稱視覺驗收通過。

## 8. 不在 A2 範圍
不做結構計算、建照、消防審查、施工圖或絕對光學真實的離線路徑追蹤；也不承諾 AI 風格圖與幾何模型 100% 相符。

## 9. 風險控制
* GitHub Pages 是靜態服務；採本地靜態資產／相容的 CDN，不依賴需要付費的伺服器。
* 大型 GLB/HDR 貼圖可能使 iPhone 畫面卡頓；提供載入進度、LOD／fallback 與資產預算。
* 修改房間後可能改變牆段拓撲；以 stable wall ID／開口重綁定或顯示待修復提示，禁止默默丟失自訂門窗。
* 未經明確授權，不把 Cloudflare Worker 密碼保存至 GitHub 或匯出的設計 JSON。

## 10. 外部參考
* Three.js GLTFLoader：https://threejs.org/docs/pages/GLTFLoader
* Three.js MeshPhysicalMaterial：https://threejs.org/docs/pages/MeshPhysicalMaterial.html
* Poly Haven CC0 license：https://polyhaven.com/license
* ambientCG：https://ambientcg.com/

本文件為實作規格，不代表 A2 已完成。