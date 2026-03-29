const express = require('express')
const cors = require('cors')
const Database = require('better-sqlite3')
const path = require('path')
const https = require('https')

const app = express()
const PORT = process.env.PORT || 8080
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'sme.db')

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// ─── Database Setup ────────────────────────────────────────────────────────
const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id          TEXT PRIMARY KEY,
    date        TEXT NOT NULL,
    description TEXT NOT NULL,
    category    TEXT NOT NULL,
    amount      REAL NOT NULL DEFAULT 0,
    type        TEXT NOT NULL CHECK(type IN ('income','expense')),
    status      TEXT NOT NULL CHECK(status IN ('completed','pending','cancelled'))
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id       TEXT PRIMARY KEY,
    client   TEXT NOT NULL,
    date     TEXT NOT NULL,
    dueDate  TEXT NOT NULL,
    amount   REAL NOT NULL DEFAULT 0,
    status   TEXT NOT NULL CHECK(status IN ('paid','unpaid','overdue'))
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id  TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT,
    quantity    REAL DEFAULT 1,
    unitPrice   REAL DEFAULT 0,
    total       REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS cost_items (
    id          TEXT PRIMARY KEY,
    category    TEXT NOT NULL,
    subcategory TEXT NOT NULL,
    description TEXT NOT NULL,
    budget      REAL NOT NULL DEFAULT 0,
    actual      REAL NOT NULL DEFAULT 0,
    month       TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    platform    TEXT NOT NULL,
    startDate   TEXT NOT NULL,
    endDate     TEXT NOT NULL,
    budget      REAL NOT NULL DEFAULT 0,
    spent       REAL NOT NULL DEFAULT 0,
    impressions INTEGER NOT NULL DEFAULT 0,
    clicks      INTEGER NOT NULL DEFAULT 0,
    conversions INTEGER NOT NULL DEFAULT 0,
    revenue     REAL NOT NULL DEFAULT 0,
    status      TEXT NOT NULL CHECK(status IN ('active','paused','ended'))
  );

  CREATE TABLE IF NOT EXISTS monthly_data (
    month   TEXT PRIMARY KEY,
    income  REAL NOT NULL DEFAULT 0,
    expense REAL NOT NULL DEFAULT 0,
    profit  REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT
  );
`)

// ─── New extended tables ────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS cost_categories (
    id    TEXT PRIMARY KEY,
    name  TEXT NOT NULL,
    type  TEXT NOT NULL DEFAULT 'fixed' CHECK(type IN ('variable','fixed')),
    color TEXT NOT NULL DEFAULT '#6b7280'
  );
  CREATE TABLE IF NOT EXISTS vendors (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    contact      TEXT DEFAULT '',
    email        TEXT DEFAULT '',
    phone        TEXT DEFAULT '',
    paymentTerms INTEGER DEFAULT 30
  );
  CREATE TABLE IF NOT EXISTS cost_records (
    id              TEXT PRIMARY KEY,
    date            TEXT NOT NULL,
    categoryId      TEXT REFERENCES cost_categories(id),
    vendorId        TEXT REFERENCES vendors(id),
    description     TEXT NOT NULL,
    amount          REAL NOT NULL DEFAULT 0,
    paidAmount      REAL NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('paid','partial','unpaid','refunded')),
    costType        TEXT NOT NULL DEFAULT 'fixed' CHECK(costType IN ('variable','fixed')),
    isRecurring     INTEGER NOT NULL DEFAULT 0,
    recurringPeriod TEXT DEFAULT 'monthly',
    month           TEXT NOT NULL,
    notes           TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS product_costs (
    id          TEXT PRIMARY KEY,
    productName TEXT NOT NULL,
    channel     TEXT NOT NULL DEFAULT '直接銷售',
    revenue     REAL NOT NULL DEFAULT 0,
    cogs        REAL NOT NULL DEFAULT 0,
    adSpend     REAL NOT NULL DEFAULT 0,
    otherCosts  REAL NOT NULL DEFAULT 0,
    orders      INTEGER NOT NULL DEFAULT 0,
    month       TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sales_channels (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    platform   TEXT NOT NULL,
    commission REAL NOT NULL DEFAULT 0,
    revenue    REAL NOT NULL DEFAULT 0,
    cogs       REAL NOT NULL DEFAULT 0,
    adSpend    REAL NOT NULL DEFAULT 0,
    orders     INTEGER NOT NULL DEFAULT 0,
    month      TEXT NOT NULL
  );
`)

// ─── Ad Management tables (Phase 1 schema — matches types/index.ts) ─────────
db.exec(`
  CREATE TABLE IF NOT EXISTS meta_integration_settings (
    id                  TEXT PRIMARY KEY,
    brandId             TEXT NOT NULL DEFAULT '',
    accessToken         TEXT NOT NULL DEFAULT '',
    defaultAdAccountId  TEXT NOT NULL DEFAULT '',
    defaultPageId       TEXT NOT NULL DEFAULT '',
    defaultPixelId      TEXT NOT NULL DEFAULT '',
    isConnected         INTEGER NOT NULL DEFAULT 0,
    lastCheckedAt       TEXT NOT NULL DEFAULT '',
    status              TEXT NOT NULL DEFAULT 'disconnected',
    updatedAt           TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS ad_campaigns (
    id                TEXT PRIMARY KEY,
    brandId           TEXT NOT NULL DEFAULT '',
    productId         TEXT NOT NULL DEFAULT '',
    name              TEXT NOT NULL DEFAULT '',
    objective         TEXT NOT NULL DEFAULT 'CONVERSIONS',
    budget            REAL NOT NULL DEFAULT 0,
    startDate         TEXT NOT NULL DEFAULT '',
    endDate           TEXT NOT NULL DEFAULT '',
    landingPageUrl    TEXT NOT NULL DEFAULT '',
    audienceProfileId TEXT NOT NULL DEFAULT '',
    styleType         TEXT NOT NULL DEFAULT 'product',
    status            TEXT NOT NULL DEFAULT 'draft',
    createdAt         TEXT NOT NULL DEFAULT '',
    updatedAt         TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS ad_copy_versions (
    id           TEXT PRIMARY KEY,
    campaignId   TEXT NOT NULL DEFAULT '',
    productId    TEXT NOT NULL DEFAULT '',
    primaryText  TEXT NOT NULL DEFAULT '',
    headline     TEXT NOT NULL DEFAULT '',
    description  TEXT NOT NULL DEFAULT '',
    callToAction TEXT NOT NULL DEFAULT '',
    audienceType TEXT NOT NULL DEFAULT '',
    styleType    TEXT NOT NULL DEFAULT '',
    status       TEXT NOT NULL DEFAULT 'draft',
    createdAt    TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS ad_creatives (
    id          TEXT PRIMARY KEY,
    campaignId  TEXT NOT NULL DEFAULT '',
    imageUrl    TEXT NOT NULL DEFAULT '',
    imageRatio  TEXT NOT NULL DEFAULT '1:1',
    title       TEXT NOT NULL DEFAULT '',
    overlayText TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'draft',
    createdAt   TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS ad_performance (
    id          TEXT PRIMARY KEY,
    campaignId  TEXT NOT NULL DEFAULT '',
    spend       REAL NOT NULL DEFAULT 0,
    impressions INTEGER NOT NULL DEFAULT 0,
    clicks      INTEGER NOT NULL DEFAULT 0,
    ctr         REAL NOT NULL DEFAULT 0,
    cpc         REAL NOT NULL DEFAULT 0,
    purchases   INTEGER NOT NULL DEFAULT 0,
    roas        REAL NOT NULL DEFAULT 0,
    status      TEXT NOT NULL DEFAULT 'paused',
    updatedAt   TEXT NOT NULL DEFAULT ''
  );
`)

// CRUD routes for ad management (ready for Phase 2 real API)
app.get('/api/ad-campaigns', (_req, res) =>
  res.json(db.prepare('SELECT * FROM ad_campaigns ORDER BY createdAt DESC').all()))
app.post('/api/ad-campaigns', (req, res) => {
  const c = req.body
  try { db.prepare(`INSERT OR REPLACE INTO ad_campaigns VALUES (@id,@brandId,@productId,@name,@objective,@budget,@startDate,@endDate,@landingPageUrl,@audienceProfileId,@styleType,@status,@createdAt,@updatedAt)`).run(c); res.json(c) }
  catch (e) { res.status(400).json({ error: e.message }) }
})
app.put('/api/ad-campaigns/:id', (req, res) => {
  const c = { ...req.body, id: req.params.id }
  try { db.prepare(`INSERT OR REPLACE INTO ad_campaigns VALUES (@id,@brandId,@productId,@name,@objective,@budget,@startDate,@endDate,@landingPageUrl,@audienceProfileId,@styleType,@status,@createdAt,@updatedAt)`).run(c); res.json(c) }
  catch (e) { res.status(400).json({ error: e.message }) }
})
app.delete('/api/ad-campaigns/:id', (req, res) => {
  db.prepare('DELETE FROM ad_campaigns WHERE id=?').run(req.params.id); res.json({ ok: true })
})

app.get('/api/ad-copy-versions', (_req, res) =>
  res.json(db.prepare('SELECT * FROM ad_copy_versions ORDER BY createdAt DESC').all()))
app.post('/api/ad-copy-versions', (req, res) => {
  const v = req.body
  try { db.prepare(`INSERT OR REPLACE INTO ad_copy_versions VALUES (@id,@campaignId,@productId,@primaryText,@headline,@description,@callToAction,@audienceType,@styleType,@status,@createdAt)`).run(v); res.json(v) }
  catch (e) { res.status(400).json({ error: e.message }) }
})
app.put('/api/ad-copy-versions/:id', (req, res) => {
  const v = { ...req.body, id: req.params.id }
  try { db.prepare(`INSERT OR REPLACE INTO ad_copy_versions VALUES (@id,@campaignId,@productId,@primaryText,@headline,@description,@callToAction,@audienceType,@styleType,@status,@createdAt)`).run(v); res.json(v) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

// ─── Ad Creatives routes ─────────────────────────────────────────────────────
// Migrations: add new optional columns to existing table
try { db.exec("ALTER TABLE ad_creatives ADD COLUMN copyVersionId TEXT NOT NULL DEFAULT ''") } catch (_) {}
try { db.exec("ALTER TABLE ad_creatives ADD COLUMN productName   TEXT NOT NULL DEFAULT ''") } catch (_) {}
try { db.exec("ALTER TABLE ad_creatives ADD COLUMN aiPrompt      TEXT NOT NULL DEFAULT ''") } catch (_) {}

app.get('/api/ad-creatives', (_req, res) =>
  res.json(db.prepare('SELECT * FROM ad_creatives ORDER BY createdAt DESC').all()))

app.post('/api/ad-creatives', (req, res) => {
  const c = req.body
  const row = { ...c, copyVersionId: c.copyVersionId ?? '', productName: c.productName ?? '', aiPrompt: c.aiPrompt ?? '' }
  try {
    db.prepare(`INSERT OR REPLACE INTO ad_creatives
      VALUES (@id,@campaignId,@imageUrl,@imageRatio,@title,@overlayText,@status,@createdAt,@copyVersionId,@productName,@aiPrompt)`)
      .run(row)
    res.json(row)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.put('/api/ad-creatives/:id', (req, res) => {
  const c = { ...req.body, id: req.params.id, copyVersionId: req.body.copyVersionId ?? '', productName: req.body.productName ?? '', aiPrompt: req.body.aiPrompt ?? '' }
  try {
    db.prepare(`INSERT OR REPLACE INTO ad_creatives
      VALUES (@id,@campaignId,@imageUrl,@imageRatio,@title,@overlayText,@status,@createdAt,@copyVersionId,@productName,@aiPrompt)`)
      .run(c)
    res.json(c)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.delete('/api/ad-creatives/:id', (req, res) => {
  db.prepare('DELETE FROM ad_creatives WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

app.get('/api/ad-performance', (_req, res) =>
  res.json(db.prepare('SELECT * FROM ad_performance ORDER BY updatedAt DESC').all()))
app.put('/api/ad-performance/:id', (req, res) => {
  const p = { ...req.body, id: req.params.id }
  try { db.prepare(`INSERT OR REPLACE INTO ad_performance VALUES (@id,@campaignId,@spend,@impressions,@clicks,@ctr,@cpc,@purchases,@roas,@status,@updatedAt)`).run(p); res.json(p) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

// ─── Ad Copies table ────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS ad_copies (
    id             TEXT PRIMARY KEY,
    groupId        TEXT NOT NULL DEFAULT '',
    version        INTEGER NOT NULL DEFAULT 1,
    status         TEXT NOT NULL DEFAULT 'draft',
    platform       TEXT NOT NULL DEFAULT '',
    format         TEXT NOT NULL DEFAULT 'feed',
    productName    TEXT NOT NULL DEFAULT '',
    targetAudience TEXT NOT NULL DEFAULT '',
    tone           TEXT NOT NULL DEFAULT 'professional',
    headline       TEXT NOT NULL DEFAULT '',
    primaryText    TEXT NOT NULL DEFAULT '',
    description    TEXT NOT NULL DEFAULT '',
    callToAction   TEXT NOT NULL DEFAULT '',
    notes          TEXT NOT NULL DEFAULT '',
    createdAt      TEXT NOT NULL DEFAULT ''
  );
`)

// ─── Settings table ─────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`)
db.prepare("INSERT OR IGNORE INTO settings VALUES('company_name','我的公司')").run()
db.prepare("INSERT OR IGNORE INTO settings VALUES('demo_mode','true')").run()
db.prepare("INSERT OR IGNORE INTO settings VALUES('password','admin')").run()

// ─── Migrations ────────────────────────────────────────────────────────────
try { db.exec("ALTER TABLE invoices ADD COLUMN taxRate REAL NOT NULL DEFAULT 0.05") } catch (_) {}
try { db.exec("ALTER TABLE cost_items ADD COLUMN costType TEXT NOT NULL DEFAULT 'fixed'") } catch (_) {}
try { db.exec("ALTER TABLE invoices ADD COLUMN taxMonth TEXT NOT NULL DEFAULT ''") } catch (_) {}
try { db.exec("ALTER TABLE invoices ADD COLUMN invoiceNumber TEXT NOT NULL DEFAULT ''") } catch (_) {}
// Backfill taxMonth from date column where empty
db.prepare("UPDATE invoices SET taxMonth = substr(date,1,7) WHERE taxMonth = '' OR taxMonth IS NULL").run()

// Seed demo data on first run (or when demo_mode=true and not yet seeded)
const seeded    = db.prepare("SELECT value FROM meta WHERE key='seeded'").get()
const demoMode  = db.prepare("SELECT value FROM settings WHERE key='demo_mode'").get()?.value === 'true'
if (!seeded && demoMode) {
  seedDatabase()
  db.prepare("INSERT OR REPLACE INTO meta(key,value) VALUES('seeded','1')").run()
}

function seedDatabase() {
  // ── Extended tables seed ──
  const insCat = db.prepare(`INSERT OR IGNORE INTO cost_categories VALUES (@id,@name,@type,@color)`)
  const cats = [
    { id:'CAT-001', name:'商品成本',   type:'variable', color:'#ef4444' },
    { id:'CAT-002', name:'包材費用',   type:'variable', color:'#f97316' },
    { id:'CAT-003', name:'運費費用',   type:'variable', color:'#eab308' },
    { id:'CAT-004', name:'平台抽成',   type:'variable', color:'#84cc16' },
    { id:'CAT-005', name:'廣告分攤',   type:'variable', color:'#06b6d4' },
    { id:'CAT-006', name:'其他變動',   type:'variable', color:'#8b5cf6' },
    { id:'CAT-007', name:'人事費用',   type:'fixed',    color:'#3b82f6' },
    { id:'CAT-008', name:'租金費用',   type:'fixed',    color:'#6366f1' },
    { id:'CAT-009', name:'設備維護',   type:'fixed',    color:'#ec4899' },
    { id:'CAT-010', name:'辦公費用',   type:'fixed',    color:'#14b8a6' },
    { id:'CAT-011', name:'軟體費用',   type:'fixed',    color:'#a78bfa' },
    { id:'CAT-012', name:'保險費用',   type:'fixed',    color:'#fb923c' },
  ]
  cats.forEach(c => insCat.run(c))

  const insVen = db.prepare(`INSERT OR IGNORE INTO vendors VALUES (@id,@name,@contact,@email,@phone,@paymentTerms)`)
  const vendors = [
    { id:'VEN-001', name:'台灣製造股份有限公司', contact:'王大明', email:'wang@twmfg.com', phone:'02-2345-6789', paymentTerms:30 },
    { id:'VEN-002', name:'快遞物流有限公司',     contact:'陳小花', email:'chen@delivery.com', phone:'02-8765-4321', paymentTerms:15 },
    { id:'VEN-003', name:'Google Taiwan',         contact:'',       email:'billing@google.com', phone:'',           paymentTerms:30 },
    { id:'VEN-004', name:'Facebook Taiwan',       contact:'',       email:'billing@meta.com',   phone:'',           paymentTerms:30 },
    { id:'VEN-005', name:'信義區房東',            contact:'李先生', email:'',                   phone:'0912-345-678', paymentTerms:30 },
  ]
  vendors.forEach(v => insVen.run(v))

  const insRec = db.prepare(`INSERT OR IGNORE INTO cost_records(id,date,categoryId,vendorId,description,amount,paidAmount,status,costType,isRecurring,recurringPeriod,month,notes) VALUES (@id,@date,@categoryId,@vendorId,@description,@amount,@paidAmount,@status,@costType,@isRecurring,@recurringPeriod,@month,@notes)`)
  const records = [
    { id:'REC-001', date:'2024-12-01', categoryId:'CAT-001', vendorId:'VEN-001', description:'12月電子元件採購', amount:185000, paidAmount:185000, status:'paid',    costType:'variable', isRecurring:0, recurringPeriod:'',        month:'2024-12', notes:'' },
    { id:'REC-002', date:'2024-12-01', categoryId:'CAT-002', vendorId:'VEN-001', description:'12月包裝材料',     amount:38200,  paidAmount:38200,  status:'paid',    costType:'variable', isRecurring:0, recurringPeriod:'',        month:'2024-12', notes:'' },
    { id:'REC-003', date:'2024-12-05', categoryId:'CAT-003', vendorId:'VEN-002', description:'12月運費費用',     amount:24500,  paidAmount:12250,  status:'partial', costType:'variable', isRecurring:0, recurringPeriod:'',        month:'2024-12', notes:'分期付款' },
    { id:'REC-004', date:'2024-12-01', categoryId:'CAT-005', vendorId:'VEN-003', description:'Google Ads 12月', amount:42000,  paidAmount:42000,  status:'paid',    costType:'variable', isRecurring:1, recurringPeriod:'monthly', month:'2024-12', notes:'' },
    { id:'REC-005', date:'2024-12-01', categoryId:'CAT-005', vendorId:'VEN-004', description:'Facebook 廣告 12月',amount:41500, paidAmount:41500, status:'paid',    costType:'variable', isRecurring:1, recurringPeriod:'monthly', month:'2024-12', notes:'' },
    { id:'REC-006', date:'2024-12-01', categoryId:'CAT-007', vendorId:null,      description:'12月員工薪資',     amount:446200, paidAmount:446200, status:'paid',   costType:'fixed',    isRecurring:1, recurringPeriod:'monthly', month:'2024-12', notes:'' },
    { id:'REC-007', date:'2024-12-01', categoryId:'CAT-008', vendorId:'VEN-005', description:'辦公室租金 12月',  amount:68000,  paidAmount:68000,  status:'paid',    costType:'fixed',    isRecurring:1, recurringPeriod:'monthly', month:'2024-12', notes:'' },
    { id:'REC-008', date:'2024-12-01', categoryId:'CAT-008', vendorId:null,      description:'倉庫租金 12月',    amount:22000,  paidAmount:22000,  status:'paid',    costType:'fixed',    isRecurring:1, recurringPeriod:'monthly', month:'2024-12', notes:'' },
    { id:'REC-009', date:'2024-12-10', categoryId:'CAT-009', vendorId:null,      description:'伺服器維護費',     amount:25000,  paidAmount:0,       status:'unpaid',  costType:'fixed',    isRecurring:0, recurringPeriod:'',        month:'2024-12', notes:'' },
    { id:'REC-010', date:'2024-12-15', categoryId:'CAT-010', vendorId:null,      description:'辦公用品採購',     amount:7200,   paidAmount:7200,    status:'paid',    costType:'fixed',    isRecurring:0, recurringPeriod:'',        month:'2024-12', notes:'' },
    { id:'REC-011', date:'2024-11-01', categoryId:'CAT-001', vendorId:'VEN-001', description:'11月電子元件採購', amount:192000, paidAmount:192000, status:'paid',    costType:'variable', isRecurring:0, recurringPeriod:'',        month:'2024-11', notes:'' },
    { id:'REC-012', date:'2024-11-01', categoryId:'CAT-005', vendorId:'VEN-003', description:'Google Ads 11月', amount:44500,  paidAmount:44500,  status:'paid',    costType:'variable', isRecurring:1, recurringPeriod:'monthly', month:'2024-11', notes:'' },
    { id:'REC-013', date:'2024-11-01', categoryId:'CAT-007', vendorId:null,      description:'11月員工薪資',     amount:271000, paidAmount:271000, status:'paid',   costType:'fixed',    isRecurring:1, recurringPeriod:'monthly', month:'2024-11', notes:'' },
  ]
  records.forEach(r => insRec.run(r))

  const insProd = db.prepare(`INSERT OR IGNORE INTO product_costs VALUES (@id,@productName,@channel,@revenue,@cogs,@adSpend,@otherCosts,@orders,@month)`)
  const products = [
    { id:'PROD-001', productName:'ERP系統導入服務', channel:'直接銷售', revenue:336000, cogs:50000, adSpend:15000, otherCosts:8000, orders:2, month:'2024-12' },
    { id:'PROD-002', productName:'系統客製化開發',  channel:'直接銷售', revenue:294000, cogs:80000, adSpend:10000, otherCosts:5000, orders:3, month:'2024-12' },
    { id:'PROD-003', productName:'電商平台建置',    channel:'1shop',    revenue:231000, cogs:40000, adSpend:25000, otherCosts:8000, orders:5, month:'2024-12' },
    { id:'PROD-004', productName:'AI分析平台',      channel:'直接銷售', revenue:176400, cogs:30000, adSpend:18000, otherCosts:3000, orders:4, month:'2024-12' },
    { id:'PROD-005', productName:'培訓課程',        channel:'線上平台', revenue:120000, cogs:15000, adSpend:12000, otherCosts:2000, orders:8, month:'2024-12' },
    { id:'PROD-006', productName:'品質管理系統',    channel:'直接銷售', revenue:99750,  cogs:20000, adSpend:8000,  otherCosts:2000, orders:2, month:'2024-12' },
  ]
  products.forEach(p => insProd.run(p))

  const insChan = db.prepare(`INSERT OR IGNORE INTO sales_channels VALUES (@id,@name,@platform,@commission,@revenue,@cogs,@adSpend,@orders,@month)`)
  const channels = [
    { id:'CHAN-001', name:'直接銷售', platform:'官網/直銷', commission:0,    revenue:906150, cogs:180000, adSpend:51000, orders:11, month:'2024-12' },
    { id:'CHAN-002', name:'1shop 電商',platform:'1shop',    commission:0.03, revenue:231000, cogs:40000,  adSpend:25000, orders:5,  month:'2024-12' },
    { id:'CHAN-003', name:'線上學習平台',platform:'Hahow',  commission:0.2,  revenue:120000, cogs:15000,  adSpend:12000, orders:8,  month:'2024-12' },
    { id:'CHAN-004', name:'直接銷售', platform:'官網/直銷', commission:0,    revenue:735000, cogs:155000, adSpend:44500, orders:9,  month:'2024-11' },
    { id:'CHAN-005', name:'1shop 電商',platform:'1shop',    commission:0.03, revenue:185000, cogs:35000,  adSpend:20000, orders:4,  month:'2024-11' },
  ]
  channels.forEach(c => insChan.run(c))

  const insertTx = db.prepare(`INSERT OR IGNORE INTO transactions VALUES (@id,@date,@description,@category,@amount,@type,@status)`)
  const insertInv = db.prepare(`INSERT OR IGNORE INTO invoices(id,client,date,dueDate,amount,status,taxRate) VALUES (@id,@client,@date,@dueDate,@amount,@status,@taxRate)`)
  const insertInvItem = db.prepare(`INSERT INTO invoice_items(invoice_id,description,quantity,unitPrice,total) VALUES (@invoice_id,@description,@quantity,@unitPrice,@total)`)
  const insertCost = db.prepare(`INSERT OR IGNORE INTO cost_items(id,category,subcategory,description,budget,actual,month,costType) VALUES (@id,@category,@subcategory,@description,@budget,@actual,@month,@costType)`)
  const insertCam = db.prepare(`INSERT OR IGNORE INTO campaigns VALUES (@id,@name,@platform,@startDate,@endDate,@budget,@spent,@impressions,@clicks,@conversions,@revenue,@status)`)
  const insertMonthly = db.prepare(`INSERT OR IGNORE INTO monthly_data VALUES (@month,@income,@expense,@profit)`)

  // Monthly data
  const monthly = [
    { month:'1月', income:520000, expense:380000, profit:140000 },
    { month:'2月', income:480000, expense:355000, profit:125000 },
    { month:'3月', income:610000, expense:420000, profit:190000 },
    { month:'4月', income:590000, expense:410000, profit:180000 },
    { month:'5月', income:650000, expense:445000, profit:205000 },
    { month:'6月', income:720000, expense:490000, profit:230000 },
    { month:'7月', income:680000, expense:470000, profit:210000 },
    { month:'8月', income:750000, expense:510000, profit:240000 },
    { month:'9月', income:700000, expense:480000, profit:220000 },
    { month:'10月', income:780000, expense:530000, profit:250000 },
    { month:'11月', income:820000, expense:560000, profit:260000 },
    { month:'12月', income:890000, expense:590000, profit:300000 },
  ]
  monthly.forEach(m => insertMonthly.run(m))

  // Transactions
  const txs = [
    { id:'TXN-001', date:'2024-12-01', description:'台積電零組件採購款', category:'原物料採購', amount:185000, type:'expense', status:'completed' },
    { id:'TXN-002', date:'2024-12-03', description:'台灣大哥大廣告服務款', category:'廣告收入', amount:320000, type:'income', status:'completed' },
    { id:'TXN-003', date:'2024-12-05', description:'員工薪資（12月份）', category:'人事費用', amount:248000, type:'expense', status:'completed' },
    { id:'TXN-004', date:'2024-12-08', description:'聯發科技顧問費', category:'顧問收入', amount:95000, type:'income', status:'completed' },
    { id:'TXN-005', date:'2024-12-10', description:'辦公室租金（12月份）', category:'租金費用', amount:68000, type:'expense', status:'completed' },
    { id:'TXN-006', date:'2024-12-12', description:'Google Ads 廣告費用', category:'行銷費用', amount:42000, type:'expense', status:'completed' },
    { id:'TXN-007', date:'2024-12-15', description:'鴻海精密產品銷售款', category:'產品銷售', amount:450000, type:'income', status:'completed' },
    { id:'TXN-008', date:'2024-12-16', description:'設備維護保養費', category:'設備維護', amount:28500, type:'expense', status:'completed' },
    { id:'TXN-009', date:'2024-12-18', description:'中華電信系統整合案', category:'系統整合', amount:280000, type:'income', status:'pending' },
    { id:'TXN-010', date:'2024-12-19', description:'Facebook 廣告投放費', category:'行銷費用', amount:35000, type:'expense', status:'completed' },
    { id:'TXN-011', date:'2024-12-20', description:'水電費（12月份）', category:'水電費用', amount:15800, type:'expense', status:'completed' },
    { id:'TXN-012', date:'2024-12-21', description:'富邦金控培訓課程款', category:'培訓收入', amount:120000, type:'income', status:'completed' },
    { id:'TXN-013', date:'2024-12-22', description:'辦公用品採購', category:'辦公費用', amount:12400, type:'expense', status:'completed' },
    { id:'TXN-014', date:'2024-12-23', description:'國泰人壽保險費', category:'保險費用', amount:18600, type:'expense', status:'completed' },
    { id:'TXN-015', date:'2024-12-24', description:'大立光電專案服務費', category:'服務收入', amount:195000, type:'income', status:'pending' },
    { id:'TXN-016', date:'2024-12-26', description:'軟體授權費用（年費）', category:'軟體費用', amount:54000, type:'expense', status:'completed' },
    { id:'TXN-017', date:'2024-12-28', description:'統一企業電商平台服務', category:'電商收入', amount:88000, type:'income', status:'completed' },
    { id:'TXN-018', date:'2024-12-30', description:'差旅費報銷', category:'差旅費用', amount:22300, type:'expense', status:'cancelled' },
  ]
  txs.forEach(t => insertTx.run(t))

  // Invoices + items
  const invData = [
    { id:'INV-2024-001', client:'台積電股份有限公司', date:'2024-11-01', dueDate:'2024-11-30', amount:336000, taxRate:0.05, status:'paid',
      items:[{ description:'ERP系統導入服務', quantity:1, unitPrice:200000, total:200000 }, { description:'系統客製化開發', quantity:80, unitPrice:1500, total:120000 }] },
    { id:'INV-2024-002', client:'鴻海精密工業股份有限公司', date:'2024-11-15', dueDate:'2024-12-15', amount:472500, taxRate:0.05, status:'paid',
      items:[{ description:'生產管理系統授權', quantity:1, unitPrice:300000, total:300000 }, { description:'教育訓練課程', quantity:3, unitPrice:50000, total:150000 }] },
    { id:'INV-2024-003', client:'中華電信股份有限公司', date:'2024-12-01', dueDate:'2024-12-31', amount:294000, taxRate:0.05, status:'unpaid',
      items:[{ description:'網路安全審計服務', quantity:1, unitPrice:180000, total:180000 }, { description:'資安顧問諮詢（月費）', quantity:2, unitPrice:50000, total:100000 }] },
    { id:'INV-2024-004', client:'富邦金融控股股份有限公司', date:'2024-11-20', dueDate:'2024-12-05', amount:204750, taxRate:0.05, status:'overdue',
      items:[{ description:'數位轉型顧問服務', quantity:1, unitPrice:120000, total:120000 }, { description:'員工培訓課程（5場）', quantity:5, unitPrice:15000, total:75000 }] },
    { id:'INV-2024-005', client:'聯發科技股份有限公司', date:'2024-12-10', dueDate:'2025-01-10', amount:176400, taxRate:0.05, status:'unpaid',
      items:[{ description:'AI 分析平台月租費', quantity:3, unitPrice:40000, total:120000 }, { description:'數據整合服務', quantity:1, unitPrice:48000, total:48000 }] },
    { id:'INV-2024-006', client:'大立光電股份有限公司', date:'2024-10-15', dueDate:'2024-11-15', amount:99750, taxRate:0.05, status:'overdue',
      items:[{ description:'品質管理系統維護', quantity:1, unitPrice:60000, total:60000 }, { description:'技術支援服務（月）', quantity:1, unitPrice:35000, total:35000 }] },
    { id:'INV-2024-007', client:'統一企業股份有限公司', date:'2024-12-15', dueDate:'2025-01-15', amount:231000, taxRate:0.05, status:'unpaid',
      items:[{ description:'電商平台建置', quantity:1, unitPrice:180000, total:180000 }, { description:'行動應用程式開發', quantity:1, unitPrice:40000, total:40000 }] },
    { id:'INV-2024-008', client:'國泰金融控股股份有限公司', date:'2024-12-20', dueDate:'2025-01-20', amount:399000, taxRate:0.05, status:'unpaid',
      items:[{ description:'智慧客服系統建置', quantity:1, unitPrice:250000, total:250000 }, { description:'API 整合開發', quantity:1, unitPrice:80000, total:80000 }, { description:'系統測試與驗收', quantity:1, unitPrice:50000, total:50000 }] },
  ]
  invData.forEach(inv => {
    insertInv.run({ id:inv.id, client:inv.client, date:inv.date, dueDate:inv.dueDate, amount:inv.amount, status:inv.status, taxRate:inv.taxRate })
    inv.items.forEach(item => insertInvItem.run({ invoice_id:inv.id, ...item }))
  })

  // Cost items  (costType: 'variable'=直接變動成本, 'fixed'=固定成本)
  const costs = [
    { id:'COST-001', category:'人事費用',   subcategory:'員工薪資',    description:'正職員工薪資',           budget:280000, actual:268000, month:'2024-12', costType:'fixed' },
    { id:'COST-002', category:'人事費用',   subcategory:'勞健保費',    description:'員工勞保健保費用',        budget:45000,  actual:43200,  month:'2024-12', costType:'fixed' },
    { id:'COST-003', category:'人事費用',   subcategory:'獎金',        description:'年終績效獎金',            budget:120000, actual:135000, month:'2024-12', costType:'fixed' },
    { id:'COST-004', category:'租金費用',   subcategory:'辦公室租金',  description:'台北市信義區辦公室',      budget:68000,  actual:68000,  month:'2024-12', costType:'fixed' },
    { id:'COST-005', category:'租金費用',   subcategory:'倉儲租金',    description:'新北市物流倉庫',          budget:22000,  actual:22000,  month:'2024-12', costType:'fixed' },
    { id:'COST-006', category:'廣告分攤',   subcategory:'Google 廣告', description:'Google Ads 關鍵字廣告',  budget:45000,  actual:42000,  month:'2024-12', costType:'variable' },
    { id:'COST-007', category:'廣告分攤',   subcategory:'Facebook 廣告',description:'Facebook & Instagram 廣告',budget:38000,actual:41500, month:'2024-12', costType:'variable' },
    { id:'COST-008', category:'廣告分攤',   subcategory:'LINE 廣告',   description:'LINE Ads Platform',      budget:20000,  actual:18800,  month:'2024-12', costType:'variable' },
    { id:'COST-009', category:'廣告分攤',   subcategory:'展覽活動',    description:'台灣資訊月參展費用',      budget:80000,  actual:76500,  month:'2024-12', costType:'variable' },
    { id:'COST-010', category:'設備維護',   subcategory:'電腦設備',    description:'電腦設備維修保養',        budget:15000,  actual:12800,  month:'2024-12', costType:'fixed' },
    { id:'COST-011', category:'設備維護',   subcategory:'伺服器維護',  description:'主機托管與維護費',        budget:25000,  actual:25000,  month:'2024-12', costType:'fixed' },
    { id:'COST-012', category:'辦公費用',   subcategory:'文具耗材',    description:'辦公文具及列印耗材',      budget:8000,   actual:7200,   month:'2024-12', costType:'fixed' },
    { id:'COST-013', category:'辦公費用',   subcategory:'水電費',      description:'辦公室水電費用',          budget:18000,  actual:15800,  month:'2024-12', costType:'fixed' },
    { id:'COST-014', category:'辦公費用',   subcategory:'通訊費',      description:'電話及網路費用',          budget:12000,  actual:11500,  month:'2024-12', costType:'fixed' },
    { id:'COST-015', category:'商品成本',   subcategory:'電子零件',    description:'電子元件採購',            budget:200000, actual:185000, month:'2024-12', costType:'variable' },
    { id:'COST-016', category:'包材費用',   subcategory:'包裝材料',    description:'產品包裝材料',            budget:35000,  actual:38200,  month:'2024-12', costType:'variable' },
    { id:'COST-017', category:'人事費用',   subcategory:'員工薪資',    description:'正職員工薪資',            budget:275000, actual:271000, month:'2024-11', costType:'fixed' },
    { id:'COST-018', category:'廣告分攤',   subcategory:'Google 廣告', description:'Google Ads 關鍵字廣告',  budget:42000,  actual:44500,  month:'2024-11', costType:'variable' },
    { id:'COST-019', category:'商品成本',   subcategory:'電子零件',    description:'電子元件採購',            budget:190000, actual:192000, month:'2024-11', costType:'variable' },
    { id:'COST-020', category:'人事費用',   subcategory:'員工薪資',    description:'正職員工薪資',            budget:270000, actual:268500, month:'2024-10', costType:'fixed' },
  ]
  costs.forEach(c => insertCost.run(c))

  // Campaigns
  const cams = [
    { id:'CAM-001', name:'2024 年終購物節促銷', platform:'Facebook', startDate:'2024-12-01', endDate:'2024-12-31', budget:80000, spent:68500, impressions:1250000, clicks:28400, conversions:892, revenue:445000, status:'active' },
    { id:'CAM-002', name:'Google 搜尋關鍵字廣告', platform:'Google', startDate:'2024-11-01', endDate:'2024-12-31', budget:90000, spent:87200, impressions:980000, clicks:42300, conversions:1240, revenue:620000, status:'active' },
    { id:'CAM-003', name:'Instagram 品牌形象推廣', platform:'Instagram', startDate:'2024-10-15', endDate:'2024-12-15', budget:55000, spent:55000, impressions:820000, clicks:18600, conversions:465, revenue:232500, status:'ended' },
    { id:'CAM-004', name:'LINE 官方帳號訊息推播', platform:'LINE', startDate:'2024-12-10', endDate:'2025-01-10', budget:30000, spent:12400, impressions:450000, clicks:9800, conversions:312, revenue:156000, status:'active' },
    { id:'CAM-005', name:'Google Display 展示廣告', platform:'Google', startDate:'2024-09-01', endDate:'2024-11-30', budget:65000, spent:63800, impressions:2100000, clicks:15200, conversions:380, revenue:190000, status:'ended' },
    { id:'CAM-006', name:'Facebook 再行銷廣告', platform:'Facebook', startDate:'2024-12-15', endDate:'2025-01-15', budget:40000, spent:15800, impressions:320000, clicks:8900, conversions:267, revenue:133500, status:'active' },
    { id:'CAM-007', name:'Instagram 網紅合作活動', platform:'Instagram', startDate:'2024-11-20', endDate:'2024-12-20', budget:45000, spent:45000, impressions:680000, clicks:22100, conversions:553, revenue:276500, status:'ended' },
    { id:'CAM-008', name:'LINE 新會員招募活動', platform:'LINE', startDate:'2024-12-20', endDate:'2025-02-20', budget:25000, spent:4200, impressions:180000, clicks:5600, conversions:168, revenue:84000, status:'paused' },
  ]
  cams.forEach(c => insertCam.run(c))
}

// ─── Helper: read invoices with items ─────────────────────────────────────
function getInvoicesWithItems() {
  const invs = db.prepare('SELECT * FROM invoices ORDER BY date DESC').all()
  const getItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?')
  return invs.map(inv => ({ ...inv, items: getItems.all(inv.id) }))
}

// ─── GET /api/data  (full initial load) ───────────────────────────────────
app.get('/api/data', (_req, res) => {
  try {
    const data = {
      transactions: db.prepare('SELECT * FROM transactions ORDER BY date DESC').all(),
      invoices: getInvoicesWithItems(),
      costItems: db.prepare('SELECT * FROM cost_items ORDER BY month DESC').all(),
      campaigns: db.prepare('SELECT * FROM campaigns').all(),
      monthlyData: db.prepare('SELECT * FROM monthly_data').all(),
    }
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─── Transactions ──────────────────────────────────────────────────────────
app.get('/api/transactions', (_req, res) => {
  res.json(db.prepare('SELECT * FROM transactions ORDER BY date DESC').all())
})

app.post('/api/transactions', (req, res) => {
  const t = req.body
  try {
    db.prepare('INSERT OR REPLACE INTO transactions VALUES (@id,@date,@description,@category,@amount,@type,@status)').run(t)
    res.json(t)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.post('/api/transactions/bulk', (req, res) => {
  const txs = req.body
  const stmt = db.prepare('INSERT OR REPLACE INTO transactions VALUES (@id,@date,@description,@category,@amount,@type,@status)')
  const insertAll = db.transaction((rows) => rows.forEach(r => stmt.run(r)))
  try {
    insertAll(txs)
    res.json({ inserted: txs.length })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.put('/api/transactions/:id', (req, res) => {
  const t = { ...req.body, id: req.params.id }
  try {
    db.prepare('INSERT OR REPLACE INTO transactions VALUES (@id,@date,@description,@category,@amount,@type,@status)').run(t)
    res.json(t)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.delete('/api/transactions/:id', (req, res) => {
  db.prepare('DELETE FROM transactions WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

// ─── Invoices ─────────────────────────────────────────────────────────────
app.get('/api/invoices', (_req, res) => {
  res.json(getInvoicesWithItems())
})

app.post('/api/invoices', (req, res) => {
  const { items = [], ...inv } = req.body
  if (inv.taxRate === undefined) inv.taxRate = 0.05
  if (!inv.taxMonth) inv.taxMonth = inv.date ? inv.date.substring(0, 7) : ''
  if (inv.invoiceNumber === undefined) inv.invoiceNumber = ''
  try {
    db.prepare('INSERT OR REPLACE INTO invoices(id,client,date,dueDate,amount,status,taxRate,taxMonth,invoiceNumber) VALUES (@id,@client,@date,@dueDate,@amount,@status,@taxRate,@taxMonth,@invoiceNumber)').run(inv)
    db.prepare('DELETE FROM invoice_items WHERE invoice_id=?').run(inv.id)
    const stmt = db.prepare('INSERT INTO invoice_items(invoice_id,description,quantity,unitPrice,total) VALUES (?,?,?,?,?)')
    items.forEach(item => stmt.run(inv.id, item.description, item.quantity, item.unitPrice, item.total))
    res.json({ ...inv, items })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.put('/api/invoices/:id', (req, res) => {
  const { items = [], ...inv } = { ...req.body, id: req.params.id }
  if (inv.taxRate === undefined) inv.taxRate = 0.05
  if (!inv.taxMonth) inv.taxMonth = inv.date ? inv.date.substring(0, 7) : ''
  if (inv.invoiceNumber === undefined) inv.invoiceNumber = ''
  try {
    db.prepare('INSERT OR REPLACE INTO invoices(id,client,date,dueDate,amount,status,taxRate,taxMonth,invoiceNumber) VALUES (@id,@client,@date,@dueDate,@amount,@status,@taxRate,@taxMonth,@invoiceNumber)').run(inv)
    db.prepare('DELETE FROM invoice_items WHERE invoice_id=?').run(inv.id)
    const stmt = db.prepare('INSERT INTO invoice_items(invoice_id,description,quantity,unitPrice,total) VALUES (?,?,?,?,?)')
    items.forEach(item => stmt.run(inv.id, item.description, item.quantity, item.unitPrice, item.total))
    res.json({ ...inv, items })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.delete('/api/invoices/:id', (req, res) => {
  db.prepare('DELETE FROM invoices WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

app.post('/api/invoices/bulk', (req, res) => {
  const invoices = req.body
  const stmtInv  = db.prepare('INSERT OR IGNORE INTO invoices(id,client,date,dueDate,amount,status,taxRate,taxMonth,invoiceNumber) VALUES (@id,@client,@date,@dueDate,@amount,@status,@taxRate,@taxMonth,@invoiceNumber)')
  const stmtItem = db.prepare('INSERT INTO invoice_items(invoice_id,description,quantity,unitPrice,total) VALUES (?,?,?,?,?)')
  const insertAll = db.transaction(rows => {
    rows.forEach(({ items = [], ...inv }) => {
      if (inv.taxRate === undefined) inv.taxRate = 0.05
      if (!inv.taxMonth) inv.taxMonth = inv.date ? inv.date.substring(0, 7) : ''
      if (inv.invoiceNumber === undefined) inv.invoiceNumber = ''
      stmtInv.run(inv)
      items.forEach(item => stmtItem.run(inv.id, item.description, item.quantity, item.unitPrice, item.total))
    })
  })
  try {
    insertAll(invoices)
    res.json({ inserted: invoices.length })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

// ─── Cost Items ────────────────────────────────────────────────────────────
app.get('/api/costs', (_req, res) => {
  res.json(db.prepare('SELECT * FROM cost_items ORDER BY month DESC').all())
})

app.post('/api/costs', (req, res) => {
  const c = { costType: 'fixed', ...req.body }
  try {
    db.prepare('INSERT OR REPLACE INTO cost_items(id,category,subcategory,description,budget,actual,month,costType) VALUES (@id,@category,@subcategory,@description,@budget,@actual,@month,@costType)').run(c)
    res.json(c)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.put('/api/costs/:id', (req, res) => {
  const c = { costType: 'fixed', ...req.body, id: req.params.id }
  try {
    db.prepare('INSERT OR REPLACE INTO cost_items(id,category,subcategory,description,budget,actual,month,costType) VALUES (@id,@category,@subcategory,@description,@budget,@actual,@month,@costType)').run(c)
    res.json(c)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.delete('/api/costs/:id', (req, res) => {
  db.prepare('DELETE FROM cost_items WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

// ─── Campaigns ─────────────────────────────────────────────────────────────
app.get('/api/campaigns', (_req, res) => {
  res.json(db.prepare('SELECT * FROM campaigns').all())
})

app.post('/api/campaigns', (req, res) => {
  const c = req.body
  try {
    db.prepare('INSERT OR REPLACE INTO campaigns VALUES (@id,@name,@platform,@startDate,@endDate,@budget,@spent,@impressions,@clicks,@conversions,@revenue,@status)').run(c)
    res.json(c)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.put('/api/campaigns/:id', (req, res) => {
  const c = { ...req.body, id: req.params.id }
  try {
    db.prepare('INSERT OR REPLACE INTO campaigns VALUES (@id,@name,@platform,@startDate,@endDate,@budget,@spent,@impressions,@clicks,@conversions,@revenue,@status)').run(c)
    res.json(c)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.delete('/api/campaigns/:id', (req, res) => {
  db.prepare('DELETE FROM campaigns WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

// ─── Ad Copies ────────────────────────────────────────────────────────────
app.get('/api/ad-copies', (_req, res) => {
  res.json(db.prepare('SELECT * FROM ad_copies ORDER BY createdAt DESC').all())
})

app.post('/api/ad-copies', (req, res) => {
  const copies = Array.isArray(req.body) ? req.body : [req.body]
  const stmt = db.prepare(`INSERT OR REPLACE INTO ad_copies
    (id,groupId,version,status,platform,format,productName,targetAudience,tone,headline,primaryText,description,callToAction,notes,createdAt)
    VALUES (@id,@groupId,@version,@status,@platform,@format,@productName,@targetAudience,@tone,@headline,@primaryText,@description,@callToAction,@notes,@createdAt)`)
  const insertAll = db.transaction(rows => rows.forEach(r => stmt.run(r)))
  try {
    insertAll(copies)
    res.json(copies)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.put('/api/ad-copies/:id', (req, res) => {
  const copy = { ...req.body, id: req.params.id }
  try {
    db.prepare(`INSERT OR REPLACE INTO ad_copies
      (id,groupId,version,status,platform,format,productName,targetAudience,tone,headline,primaryText,description,callToAction,notes,createdAt)
      VALUES (@id,@groupId,@version,@status,@platform,@format,@productName,@targetAudience,@tone,@headline,@primaryText,@description,@callToAction,@notes,@createdAt)`).run(copy)
    res.json(copy)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.delete('/api/ad-copies/:id', (req, res) => {
  db.prepare('DELETE FROM ad_copies WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

// ─── Monthly Data ──────────────────────────────────────────────────────────
app.get('/api/monthly', (_req, res) => {
  res.json(db.prepare('SELECT * FROM monthly_data').all())
})

app.put('/api/monthly/:month', (req, res) => {
  const m = { ...req.body, month: req.params.month }
  try {
    db.prepare('INSERT OR REPLACE INTO monthly_data VALUES (@month,@income,@expense,@profit)').run(m)
    res.json(m)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

// ─── Cost Categories ───────────────────────────────────────────────────────
app.get('/api/cost-categories', (_req, res) => res.json(db.prepare('SELECT * FROM cost_categories').all()))
app.post('/api/cost-categories', (req, res) => {
  const c = req.body
  try { db.prepare('INSERT OR REPLACE INTO cost_categories VALUES (@id,@name,@type,@color)').run(c); res.json(c) }
  catch (e) { res.status(400).json({ error: e.message }) }
})
app.put('/api/cost-categories/:id', (req, res) => {
  const c = { ...req.body, id: req.params.id }
  try { db.prepare('INSERT OR REPLACE INTO cost_categories VALUES (@id,@name,@type,@color)').run(c); res.json(c) }
  catch (e) { res.status(400).json({ error: e.message }) }
})
app.delete('/api/cost-categories/:id', (req, res) => {
  db.prepare('DELETE FROM cost_categories WHERE id=?').run(req.params.id); res.json({ ok: true })
})

// ─── Vendors ───────────────────────────────────────────────────────────────
app.get('/api/vendors', (_req, res) => res.json(db.prepare('SELECT * FROM vendors').all()))
app.post('/api/vendors', (req, res) => {
  const v = req.body
  try { db.prepare('INSERT OR REPLACE INTO vendors VALUES (@id,@name,@contact,@email,@phone,@paymentTerms)').run(v); res.json(v) }
  catch (e) { res.status(400).json({ error: e.message }) }
})
app.put('/api/vendors/:id', (req, res) => {
  const v = { ...req.body, id: req.params.id }
  try { db.prepare('INSERT OR REPLACE INTO vendors VALUES (@id,@name,@contact,@email,@phone,@paymentTerms)').run(v); res.json(v) }
  catch (e) { res.status(400).json({ error: e.message }) }
})
app.delete('/api/vendors/:id', (req, res) => {
  db.prepare('DELETE FROM vendors WHERE id=?').run(req.params.id); res.json({ ok: true })
})

// ─── Cost Records ──────────────────────────────────────────────────────────
app.get('/api/cost-records', (_req, res) => {
  const recs = db.prepare('SELECT * FROM cost_records ORDER BY date DESC').all()
  const cats = db.prepare('SELECT * FROM cost_categories').all()
  const vens = db.prepare('SELECT * FROM vendors').all()
  const catMap = Object.fromEntries(cats.map(c => [c.id, c]))
  const venMap = Object.fromEntries(vens.map(v => [v.id, v]))
  res.json(recs.map(r => ({ ...r, category: catMap[r.categoryId] || null, vendor: venMap[r.vendorId] || null })))
})
app.post('/api/cost-records', (req, res) => {
  const r = req.body
  try { db.prepare('INSERT OR REPLACE INTO cost_records(id,date,categoryId,vendorId,description,amount,paidAmount,status,costType,isRecurring,recurringPeriod,month,notes) VALUES (@id,@date,@categoryId,@vendorId,@description,@amount,@paidAmount,@status,@costType,@isRecurring,@recurringPeriod,@month,@notes)').run(r); res.json(r) }
  catch (e) { res.status(400).json({ error: e.message }) }
})
app.put('/api/cost-records/:id', (req, res) => {
  const r = { ...req.body, id: req.params.id }
  try { db.prepare('INSERT OR REPLACE INTO cost_records(id,date,categoryId,vendorId,description,amount,paidAmount,status,costType,isRecurring,recurringPeriod,month,notes) VALUES (@id,@date,@categoryId,@vendorId,@description,@amount,@paidAmount,@status,@costType,@isRecurring,@recurringPeriod,@month,@notes)').run(r); res.json(r) }
  catch (e) { res.status(400).json({ error: e.message }) }
})
app.delete('/api/cost-records/:id', (req, res) => {
  db.prepare('DELETE FROM cost_records WHERE id=?').run(req.params.id); res.json({ ok: true })
})

// ─── Product Costs ─────────────────────────────────────────────────────────
app.get('/api/product-costs', (_req, res) => res.json(db.prepare('SELECT * FROM product_costs ORDER BY month DESC').all()))
app.post('/api/product-costs', (req, res) => {
  const p = req.body
  try { db.prepare('INSERT OR REPLACE INTO product_costs VALUES (@id,@productName,@channel,@revenue,@cogs,@adSpend,@otherCosts,@orders,@month)').run(p); res.json(p) }
  catch (e) { res.status(400).json({ error: e.message }) }
})
app.put('/api/product-costs/:id', (req, res) => {
  const p = { ...req.body, id: req.params.id }
  try { db.prepare('INSERT OR REPLACE INTO product_costs VALUES (@id,@productName,@channel,@revenue,@cogs,@adSpend,@otherCosts,@orders,@month)').run(p); res.json(p) }
  catch (e) { res.status(400).json({ error: e.message }) }
})
app.delete('/api/product-costs/:id', (req, res) => {
  db.prepare('DELETE FROM product_costs WHERE id=?').run(req.params.id); res.json({ ok: true })
})

// ─── Sales Channels ────────────────────────────────────────────────────────
app.get('/api/sales-channels', (_req, res) => res.json(db.prepare('SELECT * FROM sales_channels ORDER BY month DESC').all()))
app.post('/api/sales-channels', (req, res) => {
  const c = req.body
  try { db.prepare('INSERT OR REPLACE INTO sales_channels VALUES (@id,@name,@platform,@commission,@revenue,@cogs,@adSpend,@orders,@month)').run(c); res.json(c) }
  catch (e) { res.status(400).json({ error: e.message }) }
})
app.put('/api/sales-channels/:id', (req, res) => {
  const c = { ...req.body, id: req.params.id }
  try { db.prepare('INSERT OR REPLACE INTO sales_channels VALUES (@id,@name,@platform,@commission,@revenue,@cogs,@adSpend,@orders,@month)').run(c); res.json(c) }
  catch (e) { res.status(400).json({ error: e.message }) }
})
app.delete('/api/sales-channels/:id', (req, res) => {
  db.prepare('DELETE FROM sales_channels WHERE id=?').run(req.params.id); res.json({ ok: true })
})

// ─── Business Report summary ───────────────────────────────────────────────
app.get('/api/report/:month', (req, res) => {
  const { month } = req.params
  const recs    = db.prepare('SELECT * FROM cost_records WHERE month=?').all(month)
  const prods   = db.prepare('SELECT * FROM product_costs WHERE month=?').all(month)
  const chans   = db.prepare('SELECT * FROM sales_channels WHERE month=?').all(month)
  const invs    = db.prepare("SELECT * FROM invoices WHERE strftime('%Y-%m', date)=?").all(month)
  const txs     = db.prepare("SELECT * FROM transactions WHERE strftime('%Y-%m', date)=? AND status != 'cancelled'").all(month)
  const cats    = db.prepare('SELECT * FROM cost_categories').all()
  const catMap  = Object.fromEntries(cats.map(c => [c.id, c]))

  const revenue  = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const varRecs  = recs.filter(r => r.costType === 'variable')
  const fixRecs  = recs.filter(r => r.costType === 'fixed')
  const varCost  = varRecs.reduce((s, r) => s + r.amount, 0)
  const fixCost  = fixRecs.reduce((s, r) => s + r.amount, 0)
  const grossProfit = revenue - varCost
  const netProfit   = grossProfit - fixCost

  const unpaidRecs  = recs.filter(r => r.status === 'unpaid' || r.status === 'partial')
  const unpaidInvs  = invs.filter(i => i.status !== 'paid')

  const catBreakdown = cats.map(cat => ({
    ...cat,
    amount: recs.filter(r => r.categoryId === cat.id).reduce((s, r) => s + r.amount, 0),
  })).filter(c => c.amount > 0)

  res.json({ revenue, varCost, fixCost, grossProfit, netProfit,
    grossMargin: revenue > 0 ? (grossProfit / revenue * 100) : 0,
    netMargin:   revenue > 0 ? (netProfit   / revenue * 100) : 0,
    totalCost: varCost + fixCost,
    catBreakdown, products: prods, channels: chans,
    unpaidRecs, unpaidInvs })
})

// ─── Settings ─────────────────────────────────────────────────────────────
app.get('/api/settings', (_req, res) => {
  const rows = db.prepare('SELECT * FROM settings').all()
  res.json(Object.fromEntries(rows.map(r => [r.key, r.value])))
})
app.put('/api/settings/:key', (req, res) => {
  db.prepare('INSERT OR REPLACE INTO settings VALUES (?,?)').run(req.params.key, req.body.value)
  res.json({ ok: true })
})
app.post('/api/settings/reset-demo', (_req, res) => {
  const DATA_TABLES = ['transactions','invoices','invoice_items','cost_items','campaigns',
    'cost_records','product_costs','sales_channels','cost_categories','vendors']
  db.transaction(() => {
    DATA_TABLES.forEach(t => db.prepare(`DELETE FROM ${t}`).run())
    db.prepare("DELETE FROM meta WHERE key='seeded'").run()
    db.prepare("UPDATE settings SET value='true' WHERE key='demo_mode'").run()
  })()
  seedDatabase()
  db.prepare("INSERT OR REPLACE INTO meta(key,value) VALUES('seeded','1')").run()
  res.json({ ok: true })
})
app.post('/api/settings/clear-all', (_req, res) => {
  const DATA_TABLES = ['transactions','invoices','invoice_items','cost_items','campaigns',
    'cost_records','product_costs','sales_channels','cost_categories','vendors']
  db.transaction(() => {
    DATA_TABLES.forEach(t => db.prepare(`DELETE FROM ${t}`).run())
    db.prepare("DELETE FROM meta WHERE key='seeded'").run()
    db.prepare("UPDATE settings SET value='false' WHERE key='demo_mode'").run()
  })()
  res.json({ ok: true })
})

// ─── Meta API Proxy ────────────────────────────────────────────────────────

db.exec(`CREATE TABLE IF NOT EXISTS meta_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
)`)

function metaCfg(key) {
  return db.prepare('SELECT value FROM meta_config WHERE key=?').get(key)?.value ?? ''
}
function setMetaCfg(key, value) {
  db.prepare('INSERT OR REPLACE INTO meta_config VALUES (?,?)').run(key, String(value))
}

// Low-level Meta Graph API helpers (no extra dependencies — uses built-in https)
function metaFetch(apiPath, token) {
  return new Promise((resolve, reject) => {
    const sep  = apiPath.includes('?') ? '&' : '?'
    const full = `/v19.0${apiPath}${sep}access_token=${encodeURIComponent(token)}`
    https.get({ hostname: 'graph.facebook.com', path: full, headers: { 'User-Agent': 'sme-system/1.0' } }, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => { try { resolve(JSON.parse(data)) } catch (e) { reject(e) } })
    }).on('error', reject)
  })
}
function metaPost(apiPath, token, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ ...body, access_token: token })
    const req = https.request({
      hostname: 'graph.facebook.com',
      path: `/v19.0${apiPath}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), 'User-Agent': 'sme-system/1.0' },
    }, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => { try { resolve(JSON.parse(data)) } catch (e) { reject(e) } })
    })
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

app.get('/api/meta/status', (_req, res) => {
  res.json({
    connected:      !!metaCfg('access_token'),
    userName:       metaCfg('user_name')       || undefined,
    userId:         metaCfg('user_id')         || undefined,
    adAccountId:    metaCfg('ad_account_id')   || undefined,
    adAccountName:  metaCfg('ad_account_name') || undefined,
    connectedAt:    metaCfg('connected_at')    || undefined,
  })
})

app.post('/api/meta/connect', async (req, res) => {
  const { access_token } = req.body
  if (!access_token) return res.status(400).json({ error: '請提供 Access Token' })
  try {
    const me = await metaFetch('/me?fields=id,name', access_token)
    if (me.error) return res.status(400).json({ error: me.error.message })
    setMetaCfg('access_token', access_token)
    setMetaCfg('user_id',     me.id)
    setMetaCfg('user_name',   me.name)
    setMetaCfg('connected_at', new Date().toISOString())
    setMetaCfg('ad_account_id',   '')
    setMetaCfg('ad_account_name', '')
    res.json({ ok: true, userName: me.name, userId: me.id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/meta/disconnect', (_req, res) => {
  ['access_token','user_id','user_name','ad_account_id','ad_account_name','connected_at']
    .forEach(k => db.prepare('DELETE FROM meta_config WHERE key=?').run(k))
  res.json({ ok: true })
})

app.put('/api/meta/ad-account', (req, res) => {
  const { adAccountId, adAccountName } = req.body
  setMetaCfg('ad_account_id',   adAccountId)
  setMetaCfg('ad_account_name', adAccountName)
  res.json({ ok: true })
})

app.get('/api/meta/ad-accounts', async (_req, res) => {
  const token = metaCfg('access_token')
  if (!token) return res.status(401).json({ error: '尚未連結 Meta 帳號' })
  try {
    const data = await metaFetch('/me/adaccounts?fields=id,name,currency,account_status&limit=25', token)
    if (data.error) return res.status(400).json({ error: data.error.message })
    res.json(data.data ?? [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/meta/campaigns', async (req, res) => {
  const token = metaCfg('access_token')
  if (!token) return res.status(401).json({ error: '尚未連結 Meta 帳號' })
  const adAccountId = req.query.adAccountId || metaCfg('ad_account_id')
  if (!adAccountId) return res.status(400).json({ error: '請先選擇廣告帳號' })
  try {
    const data = await metaFetch(`/${adAccountId}/campaigns?fields=id,name,status,objective&limit=50`, token)
    if (data.error) return res.status(400).json({ error: data.error.message })
    res.json(data.data ?? [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/meta/adsets', async (req, res) => {
  const token = metaCfg('access_token')
  if (!token) return res.status(401).json({ error: '尚未連結 Meta 帳號' })
  const { campaignId } = req.query
  if (!campaignId) return res.status(400).json({ error: '請提供 campaignId' })
  try {
    const data = await metaFetch(`/${campaignId}/adsets?fields=id,name,status&limit=50`, token)
    if (data.error) return res.status(400).json({ error: data.error.message })
    res.json(data.data ?? [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/meta/pages', async (_req, res) => {
  const token = metaCfg('access_token')
  if (!token) return res.status(401).json({ error: '尚未連結 Meta 帳號' })
  try {
    const data = await metaFetch('/me/accounts?fields=id,name,access_token&limit=25', token)
    if (data.error) return res.status(400).json({ error: data.error.message })
    res.json(data.data ?? [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/meta/publish
// body: { adCopyId, adSetId, pageId, pageAccessToken, destinationUrl }
app.post('/api/meta/publish', async (req, res) => {
  const token = metaCfg('access_token')
  if (!token) return res.status(401).json({ error: '尚未連結 Meta 帳號' })
  const adAccountId = metaCfg('ad_account_id')
  if (!adAccountId) return res.status(400).json({ error: '請先在設定頁選擇廣告帳號' })

  const { adCopyId, adSetId, pageId, pageAccessToken, destinationUrl } = req.body
  const copy = db.prepare('SELECT * FROM ad_copies WHERE id=?').get(adCopyId)
  if (!copy) return res.status(404).json({ error: '找不到文案' })

  const ctaMap = {
    '立即了解':'LEARN_MORE','馬上購買':'SHOP_NOW','立即搶購':'SHOP_NOW',
    '探索更多':'LEARN_MORE','免費試用':'SIGN_UP','立即預約':'CONTACT_US',
    '查看優惠':'SHOP_NOW','加入我們':'SUBSCRIBE','馬上看看':'LEARN_MORE',
  }
  const ctaType = ctaMap[copy.callToAction] ?? 'LEARN_MORE'
  const pageToken = pageAccessToken || token

  try {
    // Step 1: create ad creative
    const creative = await metaPost(`/${adAccountId}/adcreatives`, pageToken, {
      name: `[SME] ${copy.headline}`,
      object_story_spec: {
        page_id: pageId,
        link_data: {
          message:     copy.primaryText,
          link:        destinationUrl || 'https://example.com',
          name:        copy.headline,
          description: copy.description,
          call_to_action: {
            type:  ctaType,
            value: { link: destinationUrl || 'https://example.com' },
          },
        },
      },
    })
    if (creative.error) return res.status(400).json({ error: creative.error.message, detail: creative.error })

    // Step 2: create ad (PAUSED draft)
    const ad = await metaPost(`/${adAccountId}/ads`, token, {
      name:      `[SME] ${copy.headline} · ${copy.tone}`,
      adset_id:  adSetId,
      creative:  { creative_id: creative.id },
      status:    'PAUSED',
    })
    if (ad.error) return res.status(400).json({ error: ad.error.message, detail: ad.error })

    // Step 3: update local status → running
    db.prepare("UPDATE ad_copies SET status='running' WHERE id=?").run(adCopyId)
    const updated = db.prepare('SELECT * FROM ad_copies WHERE id=?').get(adCopyId)
    res.json({ ok: true, adId: ad.id, creativeId: creative.id, adCopy: updated })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Auth ──────────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body
  const stored = db.prepare("SELECT value FROM settings WHERE key='password'").get()?.value ?? 'admin'
  if (password === stored) {
    res.json({ ok: true })
  } else {
    res.status(401).json({ ok: false, message: '密碼錯誤' })
  }
})

// ─── Health check ──────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }))

// ─── Serve frontend static files (production) ─────────────────────────────
const distPath = path.join(__dirname, '../dist')
app.use(express.static(distPath))
app.use((_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ SME API Server running at http://0.0.0.0:${PORT}`)
})

setInterval(() => {}, 1000)
