# Supabase RLS 政策設計 - 架構決策記錄

## 決策背景

**日期**: 2025-12-21  
**對話**: `f62a0ee0` - Supabase Schema Fixes  
**專案**: 福至心靈籤  
**問題**: `column "user_id" does not exist` 錯誤

## 問題陳述

在實作 Supabase 資料同步功能時,遇到資料庫 schema 設計問題:
- 缺少 `user_id` 欄位導致上傳失敗
- 未設定 Row Level Security (RLS) 政策
- 使用者隱私保護不足

## 決策內容

### 資料庫 Schema 設計

#### fortune_records 表結構

```sql
CREATE TABLE fortune_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),  -- 關鍵欄位
  lot_number INTEGER NOT NULL,
  question TEXT,
  interpretation TEXT,
  fortune_type TEXT,
  timestamp BIGINT,
  donation_amount INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**關鍵設計決策**:
1. **user_id 欄位**: 關聯到 `auth.users(id)`,實現使用者隔離
2. **UUID 主鍵**: 使用 UUID 而非自增 ID,提升安全性
3. **timestamp**: 使用 BIGINT 儲存 Unix timestamp,方便前端處理

### RLS 政策設計

#### 啟用 RLS

```sql
ALTER TABLE fortune_records ENABLE ROW LEVEL SECURITY;
```

#### 政策 1: 使用者只能查看自己的紀錄

```sql
CREATE POLICY "Users can only select their own records" 
ON fortune_records FOR SELECT 
USING (auth.uid() = user_id);
```

**說明**:
- `auth.uid()`: Supabase 內建函數,取得當前登入使用者的 UID
- `USING`: 定義查詢條件,只返回符合條件的資料

#### 政策 2: 使用者只能插入自己的紀錄

```sql
CREATE POLICY "Users can only insert their own records" 
ON fortune_records FOR INSERT 
WITH CHECK (auth.uid() = user_id);
```

**說明**:
- `WITH CHECK`: 在插入前檢查,確保 `user_id` 等於當前使用者

#### 政策 3: 使用者只能更新自己的紀錄

```sql
CREATE POLICY "Users can only update their own records" 
ON fortune_records FOR UPDATE 
USING (auth.uid() = user_id);
```

#### 政策 4: 使用者只能刪除自己的紀錄

```sql
CREATE POLICY "Users can only delete their own records" 
ON fortune_records FOR DELETE 
USING (auth.uid() = user_id);
```

### 管理員特權設計

#### 管理員表

```sql
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT
);
```

#### 管理員查看所有紀錄

```sql
CREATE POLICY "Admins can view all records" 
ON fortune_records FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
);
```

#### 管理員更新所有紀錄 (補件功能)

```sql
CREATE POLICY "Admins can update records for correction" 
ON fortune_records FOR UPDATE 
USING (
  EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
);
```

**使用方式**:
1. 管理員登入後,查詢 `auth.users` 取得自己的 UID
2. 手動將 UID 插入 `admins` 表
3. 即可獲得全域權限

## 技術選型理由

### 為什麼選擇 RLS 而非應用層權限控制?

| 項目 | RLS (資料庫層) | 應用層控制 |
|------|----------------|------------|
| **安全性** | ⭐⭐⭐⭐⭐ 即使 API Key 洩漏也安全 | ⭐⭐⭐ 依賴應用邏輯 |
| **效能** | ⭐⭐⭐⭐ 資料庫層過濾 | ⭐⭐⭐ 需要額外查詢 |
| **維護性** | ⭐⭐⭐⭐ 集中管理 | ⭐⭐ 分散在各 API |
| **防禦深度** | ⭐⭐⭐⭐⭐ 最後一道防線 | ⭐⭐⭐ 可能被繞過 |

**結論**: RLS 提供資料庫層級的安全保障,即使前端或 API 被攻破,資料仍受保護。

### 為什麼使用 UUID 而非自增 ID?

| 項目 | UUID | 自增 ID |
|------|------|---------|
| **可預測性** | ❌ 無法預測 | ✅ 可預測 (安全風險) |
| **分散式** | ✅ 適合多節點 | ❌ 需要中央協調 |
| **隱私性** | ✅ 不洩漏數量 | ❌ 洩漏總筆數 |
| **URL 安全** | ✅ 難以遍歷 | ❌ 易被遍歷 |

**結論**: UUID 提供更好的安全性和隱私保護。

## 實施經驗

### 遇到的問題

#### 問題 1: 忘記加 user_id 欄位

**錯誤訊息**:
```
column "user_id" does not exist
```

**解決方案**:
```sql
ALTER TABLE fortune_records 
ADD COLUMN user_id UUID REFERENCES auth.users(id);
```

#### 問題 2: RLS 政策衝突

**現象**: 管理員和一般使用者政策互相干擾

**解決方案**: 使用 `EXISTS` 子查詢分離權限
```sql
-- 一般使用者
USING (auth.uid() = user_id)

-- 管理員 (獨立政策)
USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid()))
```

#### 問題 3: 測試時無法插入資料

**原因**: 忘記在前端設定 `user_id`

**解決方案**:
```typescript
// storageService.ts
const uploadToCloud = async (record) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  await supabase
    .from('fortune_records')
    .insert({
      ...record,
      user_id: user.id  // 關鍵!
    });
};
```

### 成功案例

**專案**: 福至心靈籤  
**工時**: 6.2 小時  
**成果**:
- ✅ 完整的 RLS 政策
- ✅ 使用者隱私保護
- ✅ 管理員補件功能
- ✅ 通過安全測試

## 最佳實踐

### 1. 設計 RLS 政策的檢查清單

```markdown
- [ ] 啟用 RLS (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- [ ] SELECT 政策 (查詢權限)
- [ ] INSERT 政策 (新增權限)
- [ ] UPDATE 政策 (更新權限)
- [ ] DELETE 政策 (刪除權限)
- [ ] 測試一般使用者權限
- [ ] 測試管理員權限
- [ ] 測試跨使用者存取 (應該失敗)
```

### 2. 測試 RLS 政策

```sql
-- 測試腳本
-- 1. 以使用者 A 身份插入資料
INSERT INTO fortune_records (user_id, question) 
VALUES ('user-a-uuid', '測試問題');

-- 2. 切換到使用者 B,嘗試查詢
SELECT * FROM fortune_records WHERE user_id = 'user-a-uuid';
-- 應該返回空結果

-- 3. 以管理員身份查詢
SELECT * FROM fortune_records;
-- 應該返回所有資料
```

### 3. 前端整合模式

```typescript
// 1. 取得當前使用者
const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// 2. 插入資料時自動加入 user_id
const saveRecord = async (record) => {
  const user = await getCurrentUser();
  
  const { data, error } = await supabase
    .from('fortune_records')
    .insert({
      ...record,
      user_id: user.id
    });
    
  if (error) throw error;
  return data;
};

// 3. 查詢時 RLS 自動過濾
const getMyRecords = async () => {
  const { data, error } = await supabase
    .from('fortune_records')
    .select('*')
    .order('created_at', { ascending: false });
    
  // RLS 自動只返回當前使用者的資料
  return data;
};
```

## 安全性考量

### 防禦層級

1. **第一層**: 前端驗證 (使用者體驗)
2. **第二層**: API 層驗證 (業務邏輯)
3. **第三層**: RLS 政策 (資料庫層) ⭐ 最重要

### 常見攻擊場景與防禦

#### 場景 1: API Key 洩漏

**攻擊**: 攻擊者取得 Supabase Anon Key,嘗試直接查詢資料庫

**防禦**: RLS 政策確保只能查詢自己的資料
```sql
-- 即使有 Anon Key,也無法查詢他人資料
USING (auth.uid() = user_id)
```

#### 場景 2: SQL Injection

**攻擊**: 嘗試透過 SQL 注入繞過權限

**防禦**: Supabase 使用參數化查詢,RLS 在資料庫層強制執行
```typescript
// 安全: Supabase 自動參數化
supabase.from('fortune_records').select('*').eq('id', userInput)
```

#### 場景 3: 跨使用者存取

**攻擊**: 修改前端程式碼,嘗試存取其他使用者資料

**防禦**: RLS 在資料庫層檢查,無法繞過
```sql
-- 即使前端傳入其他 user_id,RLS 仍會阻擋
WITH CHECK (auth.uid() = user_id)
```

## 效能優化

### 索引設計

```sql
-- 為 user_id 建立索引,加速查詢
CREATE INDEX idx_fortune_records_user_id 
ON fortune_records(user_id);

-- 為常用查詢建立複合索引
CREATE INDEX idx_fortune_records_user_timestamp 
ON fortune_records(user_id, timestamp DESC);
```

### 查詢優化

```typescript
// ✅ 好: 利用索引
const records = await supabase
  .from('fortune_records')
  .select('*')
  .order('timestamp', { ascending: false })
  .limit(30);

// ❌ 差: 全表掃描
const records = await supabase
  .from('fortune_records')
  .select('*')
  .order('question', { ascending: true });  // question 沒有索引
```

## 延伸閱讀

### Supabase 官方文檔
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers)

### 相關技術決策
- [為什麼選擇 Supabase 而非 Firebase](./為何選擇Supabase而非Firebase.md) (待建立)

## 標籤

#技術決策 #Supabase #RLS #資料庫安全 #隱私保護 #架構設計

## 專案

福至心靈籤

## 相關對話

- `f62a0ee0` - Supabase Schema Fixes (2025-12-21, 6.2小時)

## 決策狀態

✅ **已採用** - 目前作為標準資料庫安全方案
