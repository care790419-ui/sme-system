# SME 企業管理系統

中小企業一體化管理系統，整合訂單、財務、成本、廣告行銷報表。

## 功能

- **總覽首頁** — 即時 KPI、營收趨勢、應收帳款提醒
- **財務管理** — 交易記錄、發票管理（報稅月份分類）、損益報表
- **成本管理** — 變動/固定成本分類、預算追蹤
- **業務損益報表** — 毛利 / 淨利 / 通路分析
- **廣告行銷** — 活動管理、ROI 分析
- **匯入中心** — 1shop 訂單 CSV 匯入（含品項解析、自動建立發票）
- **系統設定** — 公司資訊、示範模式、密碼管理

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS |
| 後端 | Node.js + Express |
| 資料庫 | SQLite（better-sqlite3） |

## 快速啟動

### 需求
- Node.js 18+
- npm

### 安裝

```bash
git clone https://github.com/你的帳號/sme-system.git
cd sme-system
npm install
cd server && npm install && cd ..
```

### 啟動

```bash
# 同時啟動前後端（推薦）
npm start

# 或分別啟動
npm run dev:server   # 後端 http://localhost:3001
npm run dev          # 前端 http://localhost:5173
```

瀏覽器開啟 **http://localhost:5173**，預設密碼：`admin`

### 示範資料

首次啟動自動載入示範資料（可於「系統設定」→「危險操作」清除或重置）

## server 依賴安裝

server 資料夾需獨立安裝依賴：

```bash
cd server
npm install
```

若 `server/package.json` 不存在，執行：

```bash
cd server
npm init -y
npm install express cors better-sqlite3
```
