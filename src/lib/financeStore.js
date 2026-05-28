// Local-first finance data store for browser (IndexedDB primary, localStorage fallback).
// All data stays in the user's browser with a versioned schema for future migrations.

const DB_NAME = 'findash-finance';
const DB_VERSION = 1;

const DEFAULT_CATEGORIES = [
  { id: 'cat-income', label: 'รายได้ประจำ' },
  { id: 'cat-food', label: 'อาหารและเครื่องดื่ม' },
  { id: 'cat-housing', label: 'ที่อยู่อาศัย' },
  { id: 'cat-transport', label: 'การเดินทาง' },
  { id: 'cat-utility', label: 'สาธารณูปโภค' },
  { id: 'cat-shopping', label: 'ช้อปปิ้ง' },
  { id: 'cat-health', label: 'สุขภาพ' },
  { id: 'cat-entertainment', label: 'ความบันเทิง' },
  { id: 'cat-other', label: 'อื่น ๆ' },
];

const DEFAULT_RULES = [
  { pattern: 'salary|เงินเดือน|payroll', categoryId: 'cat-income', priority: 100 },
  { pattern: 'dividend|ปันผล|interest|ดอกเบี้ย', categoryId: 'cat-income', priority: 90 },
  { pattern: 'grabpay wallet', categoryId: 'cat-food', priority: 86 },
  { pattern: 'big c|บิ๊กซี|lotus|โลตัส|tops|foodland|makro|7-eleven|เซเว่น|cafe|amazon|starbucks', categoryId: 'cat-food', priority: 80 },
  { pattern: 'น้ำดื่ม|กาแฟ|ชา|restaurant|food|delivery', categoryId: 'cat-food', priority: 78 },
  { pattern: 'rent|ค่าเช่า|condo|คอนโด', categoryId: 'cat-housing', priority: 80 },
  { pattern: 'grab|bolt|taxi|bts|mrt|รถไฟฟ้า|น้ำมัน|ptt|shell', categoryId: 'cat-transport', priority: 75 },
  { pattern: 'water|ไฟฟ้า|ค่าไฟ|ค่าน้ำ|internet|โทรศัพท์|ประปา|dtac|ais|true money|ทรู มันนี|ทรูมันนี่|123 service|2c2p|ทูซีทูพี', categoryId: 'cat-utility', priority: 75 },
  { pattern: 'shopee|shopeepay|lazada|central|mall|uniqlo|zara|kex|kerry|ไปรษณีย์|ปณท', categoryId: 'cat-shopping', priority: 70 },
  { pattern: 'hospital|clinic|pharmacy|ร้านยา|โรงพยาบาล|คลินิก', categoryId: 'cat-health', priority: 70 },
  { pattern: 'netflix|spotify|cinema|movie|major|concert|google powered|google play|alipay', categoryId: 'cat-entertainment', priority: 65 },
];

const LEGACY_ACCOUNT_IDS = ['salary', 'spending', 'credit'];

let dbPromise = null;
let memoryFallback = null; // used if IDB completely unavailable
let fallbackMode = 'indexeddb'; // 'indexeddb' | 'localstorage' | 'memory'

function nowIso() {
  return new Date().toISOString();
}

function normalizeTitle(title) {
  return String(title || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function stableFingerprintHash(str) {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  let h3 = 0x9e3779b9;
  let h4 = 0x85ebca6b;

  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 16777619);
    h2 = Math.imul(h2 ^ code, 2246822507);
    h3 = Math.imul(h3 ^ code, 3266489909);
    h4 = Math.imul(h4 ^ code, 668265263);
  }

  return [h1, h2, h3, h4]
    .map((part) => (part >>> 0).toString(16).padStart(8, '0'))
    .join('');
}

function createFingerprint(accountId, transaction) {
  // Include rowNumber (or synthetic) so identical same-day rows in ONE import are kept as separate txns.
  // Re-importing same statement will produce identical fingerprints -> deduped.
  const rowId = transaction.rowNumber != null ? `r${transaction.rowNumber}` : 'r0';
  const base = [
    accountId,
    transaction.date || '',
    normalizeTitle(transaction.title),
    transaction.amountSatang,
    rowId,
  ].join('|');
  return stableFingerprintHash(base);
}

function openIDB() {
  if (dbPromise) return dbPromise;

  if (typeof indexedDB === 'undefined') {
    // No IDB at all -> localStorage or memory fallback
    return Promise.resolve(null);
  }

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const database = event.target.result;

      // accounts
      if (!database.objectStoreNames.contains('accounts')) {
        const accStore = database.createObjectStore('accounts', { keyPath: 'id' });
        accStore.createIndex('created_at', 'created_at');
      }
      // budgets
      if (!database.objectStoreNames.contains('budgets')) {
        const bStore = database.createObjectStore('budgets', { keyPath: 'id' });
        bStore.createIndex('category_id', 'category_id', { unique: true });
      }
      // goals
      if (!database.objectStoreNames.contains('goals')) {
        database.createObjectStore('goals', { keyPath: 'id' });
      }
      // profile (single record with id=1)
      if (!database.objectStoreNames.contains('profile')) {
        database.createObjectStore('profile', { keyPath: 'id' });
      }
      // categories
      if (!database.objectStoreNames.contains('categories')) {
        database.createObjectStore('categories', { keyPath: 'id' });
      }
      // category_rules
      if (!database.objectStoreNames.contains('category_rules')) {
        const rStore = database.createObjectStore('category_rules', { keyPath: 'id', autoIncrement: true });
        rStore.createIndex('priority', 'priority');
      }
      // transactions
      if (!database.objectStoreNames.contains('transactions')) {
        const tStore = database.createObjectStore('transactions', { keyPath: 'id' });
        tStore.createIndex('fingerprint', 'fingerprint', { unique: false });
        tStore.createIndex('account_id', 'account_id');
        tStore.createIndex('date', 'date');
      }
      // import_batches (light history)
      if (!database.objectStoreNames.contains('import_batches')) {
        database.createObjectStore('import_batches', { keyPath: 'id' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch(() => null);

  return dbPromise;
}

async function getDB() {
  const database = await openIDB();
  if (database) {
    fallbackMode = 'indexeddb';
    return database;
  }
  // Fallback path
  if (typeof localStorage !== 'undefined') {
    fallbackMode = 'localstorage';
    return null; // signal to use LS helpers
  }
  fallbackMode = 'memory';
  if (!memoryFallback) memoryFallback = createMemoryStore();
  return null;
}

function createMemoryStore() {
  return {
    accounts: [],
    budgets: [],
    goals: [],
    profile: { id: 1, display_name: '', avatar_initial: '', email: '', created_at: nowIso(), updated_at: nowIso() },
    categories: [...DEFAULT_CATEGORIES],
    category_rules: DEFAULT_RULES.map((r, i) => ({ id: i + 1, pattern: r.pattern, category_id: r.categoryId, priority: r.priority })),
    transactions: [],
    import_batches: [],
  };
}

// --- LocalStorage fallback (versioned, centralized) ---
const LS_KEY = 'findash_local_v1';

function readLS() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed._v === 1) return parsed;
  } catch {
    // ignore corrupt localStorage
  }
  return null;
}

function writeLS(data) {
  try {
    data._v = 1;
    data._ts = nowIso();
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    // ignore quota / private mode
  }
}

function ensureLSShape(data) {
  if (!data) data = {};
  data.accounts = data.accounts || [];
  data.budgets = data.budgets || [];
  data.goals = data.goals || [];
  data.profile = data.profile || { id: 1, display_name: '', avatar_initial: '', email: '', created_at: nowIso(), updated_at: nowIso() };
  data.categories = data.categories && data.categories.length ? data.categories : [...DEFAULT_CATEGORIES];
  data.category_rules = data.category_rules && data.category_rules.length ? data.category_rules : DEFAULT_RULES.map((r, i) => ({ id: i + 1, pattern: r.pattern, category_id: r.categoryId, priority: r.priority }));
  data.transactions = data.transactions || [];
  data.import_batches = data.import_batches || [];
  return data;
}

async function withIDBStore(storeName, mode, fn) {
  const database = await getDB();
  if (!database) {
    // LS or memory path
    if (fallbackMode === 'localstorage') {
      let data = readLS() || createMemoryStore();
      data = ensureLSShape(data);
      const result = fn({ useLS: true, data, storeName });
      if (result && result._write) {
        writeLS(result.data || data);
      }
      return result; // reads return data directly; writes return {_write} (ignored by callers)
    }
    // memory
    const mem = memoryFallback || createMemoryStore();
    memoryFallback = mem;
    return fn({ useMemory: true, data: mem, storeName });
  }

  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;
    try {
      result = fn({ store, tx });
    } catch (e) {
      reject(e);
      return;
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// Seed defaults (idempotent)
async function seedDefaults() {
  // categories
  for (const cat of DEFAULT_CATEGORIES) {
    await withIDBStore('categories', 'readwrite', ({ store, useLS, data }) => {
      if (useLS || data) {
        const exists = (data.categories || []).some((c) => c.id === cat.id);
        if (!exists) data.categories.push({ ...cat });
        return { _write: true, data };
      }
      if (!store) return;
      store.put({ ...cat });
    });
  }

  const existingRules = await withIDBStore('category_rules', 'readonly', async ({ store, useLS, data }) => {
    if (useLS || data) {
      return data.category_rules || [];
    }
    if (!store) return [];
    return new Promise((res) => {
      const req = store.getAll();
      req.onsuccess = () => res(req.result);
      req.onerror = () => res([]);
    });
  });

  const existingPatternSet = new Set(
    (existingRules || []).map((rule) => `${rule.pattern}|${rule.category_id || rule.categoryId}`),
  );

  for (const [idx, rule] of DEFAULT_RULES.entries()) {
    const key = `${rule.pattern}|${rule.categoryId}`;
    if (!existingPatternSet.has(key)) {
      await withIDBStore('category_rules', 'readwrite', ({ store, useLS, data }) => {
        if (useLS || data) {
          data.category_rules = data.category_rules || [];
          data.category_rules.push({ id: idx + 1, pattern: rule.pattern, category_id: rule.categoryId, priority: rule.priority });
          return { _write: true, data };
        }
        if (!store) return;
        store.add({ pattern: rule.pattern, category_id: rule.categoryId, priority: rule.priority });
      });
    }
  }

  // profile
  await withIDBStore('profile', 'readwrite', ({ store, useLS, data }) => {
    if (useLS || data) {
      if (!data.profile) {
        data.profile = { id: 1, display_name: '', avatar_initial: '', email: '', created_at: nowIso(), updated_at: nowIso() };
      }
      return { _write: true, data };
    }
    if (!store) return;
    const getReq = store.get(1);
    getReq.onsuccess = () => {
      if (!getReq.result) {
        store.put({ id: 1, display_name: '', avatar_initial: '', email: '', created_at: nowIso(), updated_at: nowIso() });
      }
    };
  });

  // cleanup legacy mock accounts (no-op if none)
  await cleanupLegacyMockAccounts();
}

async function cleanupLegacyMockAccounts() {
  for (const id of LEGACY_ACCOUNT_IDS) {
    const hasTx = await withIDBStore('transactions', 'readonly', ({ store, useLS, data }) => {
      if (useLS || data) return (data.transactions || []).some((t) => t.account_id === id);
      if (!store) return false;
      return new Promise((res) => {
        const idx = store.index('account_id');
        const req = idx.count(id);
        req.onsuccess = () => res(req.result > 0);
        req.onerror = () => res(false);
      });
    });
    if (hasTx) continue;

    await withIDBStore('accounts', 'readwrite', ({ store, useLS, data }) => {
      if (useLS || data) {
        data.accounts = (data.accounts || []).filter((a) => a.id !== id);
        return { _write: true, data };
      }
      if (!store) return;
      store.delete(id);
    });
  }
}

// --- Public API ---
async function init() {
  await getDB();
  await seedDefaults();
  return { mode: fallbackMode };
}

async function getAccounts() {
  await init();
  return withIDBStore('accounts', 'readonly', ({ store, useLS, data }) => {
    if (useLS || data) {
      return [...(data.accounts || [])].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    }
    if (!store) return [];
    return new Promise((res) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const list = req.result || [];
        list.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
        res(list);
      };
      req.onerror = () => res([]);
    });
  });
}

function sanitizeAccountPayload(payload = {}) {
  const name = String(payload.name || '').trim();
  if (!name) throw new Error('กรุณาระบุชื่อบัญชี');
  const type = ['bank', 'credit', 'cash'].includes(payload.type) ? payload.type : 'bank';
  const currentBalance = Number(payload.current_balance);
  const institution = String(payload.institution || '').trim();
  return {
    name,
    institution,
    type,
    current_balance: Number.isFinite(currentBalance) ? Math.round(currentBalance) : 0,
  };
}

async function createAccount(payload) {
  await init();
  const account = sanitizeAccountPayload(payload);
  const timestamp = nowIso();
  const id = `acct-${cryptoRandomId()}`;

  const record = {
    id,
    name: account.name,
    institution: account.institution,
    type: account.type,
    current_balance: account.current_balance,
    created_at: timestamp,
    updated_at: timestamp,
  };

  await withIDBStore('accounts', 'readwrite', ({ store, useLS, data }) => {
    if (useLS || data) {
      data.accounts = data.accounts || [];
      data.accounts.push(record);
      return { _write: true, data };
    }
    if (!store) return;
    store.add(record);
  });

  return record;
}

async function updateAccount(id, payload) {
  await init();
  const account = sanitizeAccountPayload(payload);
  const existing = await withIDBStore('accounts', 'readonly', ({ store, useLS, data }) => {
    if (useLS || data) return (data.accounts || []).find((a) => a.id === id);
    if (!store) return null;
    return new Promise((res) => {
      const req = store.get(id);
      req.onsuccess = () => res(req.result);
      req.onerror = () => res(null);
    });
  });
  if (!existing) throw new Error('ไม่พบบัญชีที่ต้องการแก้ไข');

  const updated = {
    ...existing,
    name: account.name,
    institution: account.institution,
    type: account.type,
    current_balance: account.current_balance,
    updated_at: nowIso(),
  };

  await withIDBStore('accounts', 'readwrite', ({ store, useLS, data }) => {
    if (useLS || data) {
      data.accounts = (data.accounts || []).map((a) => (a.id === id ? updated : a));
      return { _write: true, data };
    }
    if (!store) return;
    store.put(updated);
  });
  return updated;
}

async function deleteAccount(id) {
  await init();
  const txCount = await withIDBStore('transactions', 'readonly', ({ store, useLS, data }) => {
    if (useLS || data) return (data.transactions || []).filter((t) => t.account_id === id).length;
    if (!store) return 0;
    return new Promise((res) => {
      const idx = store.index('account_id');
      const req = idx.count(id);
      req.onsuccess = () => res(req.result);
      req.onerror = () => res(0);
    });
  });
  const batchCount = await withIDBStore('import_batches', 'readonly', ({ store, useLS, data }) => {
    if (useLS || data) return (data.import_batches || []).filter((b) => b.account_id === id).length;
    if (!store) return 0;
    return new Promise((res) => {
      const req = store.getAll();
      req.onsuccess = () => res((req.result || []).filter((b) => b.account_id === id).length);
      req.onerror = () => res(0);
    });
  });

  if (txCount > 0 || batchCount > 0) {
    throw new Error('ลบบัญชีนี้ไม่ได้ เพราะมีธุรกรรมหรือประวัติการนำเข้าอยู่');
  }

  await withIDBStore('accounts', 'readwrite', ({ store, useLS, data }) => {
    if (useLS || data) {
      data.accounts = (data.accounts || []).filter((a) => a.id !== id);
      return { _write: true, data };
    }
    if (!store) return;
    store.delete(id);
  });
  return { deleted: true };
}

async function getBudgets() {
  await init();
  return withIDBStore('budgets', 'readonly', ({ store, useLS, data }) => {
    if (useLS || data) {
      const cats = new Map((data.categories || []).map((c) => [c.id, c.label]));
      return (data.budgets || []).map((b) => ({ ...b, category_label: cats.get(b.category_id) || b.category_id }))
        .sort((a, b) => (a.category_label || '').localeCompare(b.category_label || ''));
    }
    if (!store) return [];
    return new Promise((res) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const list = req.result || [];
        // join category label (lightweight)
        withIDBStore('categories', 'readonly', ({ store: catStore }) => {
          if (!catStore) {
            res(list);
            return;
          }
          const catReq = catStore.getAll();
          catReq.onsuccess = () => {
            const cmap = new Map((catReq.result || []).map((c) => [c.id, c.label]));
            res(list.map((b) => ({ ...b, category_label: cmap.get(b.category_id) || b.category_id }))
              .sort((a, b) => (a.category_label || '').localeCompare(b.category_label || '')));
          };
          catReq.onerror = () => res(list);
        });
      };
      req.onerror = () => res([]);
    });
  });
}

function sanitizeBudgetPayload(payload = {}) {
  const categoryId = String(payload.category_id || '').trim();
  const monthlyLimit = Number(payload.monthly_limit);
  return {
    category_id: categoryId,
    monthly_limit: Number.isFinite(monthlyLimit) ? Math.max(0, Math.round(monthlyLimit)) : 0,
  };
}

async function createBudget(payload) {
  await init();
  const budget = sanitizeBudgetPayload(payload);
  // check duplicate category
  const existing = await withIDBStore('budgets', 'readonly', ({ store, useLS, data }) => {
    if (useLS || data) return (data.budgets || []).find((b) => b.category_id === budget.category_id);
    if (!store) return null;
    return new Promise((res) => {
      const idx = store.index('category_id');
      const req = idx.get(budget.category_id);
      req.onsuccess = () => res(req.result);
      req.onerror = () => res(null);
    });
  });
  if (existing) throw new Error('หมวดนี้มีงบประมาณแล้ว ให้แก้ไขรายการเดิมแทน');

  const id = `budget-${cryptoRandomId()}`;
  const timestamp = nowIso();
  const record = { id, ...budget, created_at: timestamp, updated_at: timestamp };

  await withIDBStore('budgets', 'readwrite', ({ store, useLS, data }) => {
    if (useLS || data) {
      data.budgets = data.budgets || [];
      data.budgets.push(record);
      return { _write: true, data };
    }
    if (!store) return;
    store.add(record);
  });
  return { ...record, category_label: (await getCategoryLabel(budget.category_id)) };
}

async function updateBudget(id, payload) {
  await init();
  const budget = sanitizeBudgetPayload(payload);
  const existing = await withIDBStore('budgets', 'readonly', ({ store, useLS, data }) => {
    if (useLS || data) return (data.budgets || []).find((b) => b.id === id);
    if (!store) return null;
    return new Promise((res) => { const r = store.get(id); r.onsuccess = () => res(r.result); r.onerror = () => res(null); });
  });
  if (!existing) throw new Error('ไม่พบงบประมาณที่ต้องการแก้ไข');

  // duplicate check excluding self
  const dup = await withIDBStore('budgets', 'readonly', ({ store, useLS, data }) => {
    if (useLS || data) return (data.budgets || []).find((b) => b.category_id === budget.category_id && b.id !== id);
    if (!store) return null;
    return new Promise((res) => {
      const idx = store.index('category_id');
      const req = idx.get(budget.category_id);
      req.onsuccess = () => res(req.result && req.result.id !== id ? req.result : null);
      req.onerror = () => res(null);
    });
  });
  if (dup) throw new Error('หมวดนี้มีงบประมาณแล้ว ให้เลือกหมวดอื่น');

  const updated = { ...existing, category_id: budget.category_id, monthly_limit: budget.monthly_limit, updated_at: nowIso() };
  await withIDBStore('budgets', 'readwrite', ({ store, useLS, data }) => {
    if (useLS || data) {
      data.budgets = (data.budgets || []).map((b) => (b.id === id ? updated : b));
      return { _write: true, data };
    }
    if (!store) return;
    store.put(updated);
  });
  return { ...updated, category_label: (await getCategoryLabel(updated.category_id)) };
}

async function deleteBudget(id) {
  await init();
  await withIDBStore('budgets', 'readwrite', ({ store, useLS, data }) => {
    if (useLS || data) {
      data.budgets = (data.budgets || []).filter((b) => b.id !== id);
      return { _write: true, data };
    }
    if (!store) return;
    store.delete(id);
  });
  return { deleted: true };
}

async function getGoals() {
  await init();
  return withIDBStore('goals', 'readonly', ({ store, useLS, data }) => {
    if (useLS || data) {
      return [...(data.goals || [])].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    }
    if (!store) return [];
    return new Promise((res) => {
      const req = store.getAll();
      req.onsuccess = () => res((req.result || []).sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '')));
      req.onerror = () => res([]);
    });
  });
}

function sanitizeGoalPayload(payload = {}) {
  const label = String(payload.label || '').trim();
  if (!label) throw new Error('กรุณาระบุชื่อเป้าหมาย');
  const target = Number(payload.target_amount);
  const saved = Number(payload.saved_amount);
  return {
    label,
    target_amount: Number.isFinite(target) ? Math.max(0, Math.round(target)) : 0,
    saved_amount: Number.isFinite(saved) ? Math.max(0, Math.round(saved)) : 0,
  };
}

async function createGoal(payload) {
  await init();
  const goal = sanitizeGoalPayload(payload);
  const timestamp = nowIso();
  const id = `goal-${cryptoRandomId()}`;
  const record = { id, ...goal, created_at: timestamp, updated_at: timestamp };

  await withIDBStore('goals', 'readwrite', ({ store, useLS, data }) => {
    if (useLS || data) {
      data.goals = data.goals || [];
      data.goals.push(record);
      return { _write: true, data };
    }
    if (!store) return;
    store.add(record);
  });
  return record;
}

async function updateGoal(id, payload) {
  await init();
  const goal = sanitizeGoalPayload(payload);
  const existing = await withIDBStore('goals', 'readonly', ({ store, useLS, data }) => {
    if (useLS || data) return (data.goals || []).find((g) => g.id === id);
    if (!store) return null;
    return new Promise((res) => { const r = store.get(id); r.onsuccess = () => res(r.result); r.onerror = () => res(null); });
  });
  if (!existing) throw new Error('ไม่พบเป้าหมายที่ต้องการแก้ไข');

  const updated = { ...existing, ...goal, updated_at: nowIso() };
  await withIDBStore('goals', 'readwrite', ({ store, useLS, data }) => {
    if (useLS || data) {
      data.goals = (data.goals || []).map((g) => (g.id === id ? updated : g));
      return { _write: true, data };
    }
    if (!store) return;
    store.put(updated);
  });
  return updated;
}

async function deleteGoal(id) {
  await init();
  await withIDBStore('goals', 'readwrite', ({ store, useLS, data }) => {
    if (useLS || data) {
      data.goals = (data.goals || []).filter((g) => g.id !== id);
      return { _write: true, data };
    }
    if (!store) return;
    store.delete(id);
  });
  return { deleted: true };
}

async function getUserProfile() {
  await init();
  return withIDBStore('profile', 'readonly', ({ store, useLS, data }) => {
    if (useLS || data) {
      return data.profile || { id: 1, display_name: '', avatar_initial: '', email: '', created_at: nowIso(), updated_at: nowIso() };
    }
    if (!store) return { id: 1, display_name: '', avatar_initial: '', email: '' };
    return new Promise((res) => {
      const req = store.get(1);
      req.onsuccess = () => res(req.result || { id: 1, display_name: '', avatar_initial: '', email: '', created_at: nowIso(), updated_at: nowIso() });
      req.onerror = () => res({ id: 1, display_name: '', avatar_initial: '', email: '' });
    });
  });
}

async function updateUserProfile(payload = {}) {
  await init();
  const displayName = String(payload.display_name || '').trim();
  const avatarInitial = String(payload.avatar_initial || displayName.slice(0, 1) || '').trim().slice(0, 2);
  const email = String(payload.email || '').trim();
  const timestamp = nowIso();

  const updated = {
    id: 1,
    display_name: displayName,
    avatar_initial: avatarInitial,
    email,
    created_at: timestamp,
    updated_at: timestamp,
  };

  await withIDBStore('profile', 'readwrite', ({ store, useLS, data }) => {
    if (useLS || data) {
      data.profile = updated;
      return { _write: true, data };
    }
    if (!store) return;
    store.put(updated);
  });
  return updated;
}

async function getTransactions() {
  await init();
  const txs = await withIDBStore('transactions', 'readonly', ({ store, useLS, data }) => {
    if (useLS || data) {
      return [...(data.transactions || [])].sort((a, b) =>
        (b.date || '').localeCompare(a.date || '') || (b.imported_at || '').localeCompare(a.imported_at || '')
      );
    }
    if (!store) return [];
    return new Promise((res) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const list = req.result || [];
        list.sort((a, b) =>
          (b.date || '').localeCompare(a.date || '') || (b.imported_at || '').localeCompare(a.imported_at || '')
        );
        res(list);
      };
      req.onerror = () => res([]);
    });
  });

  // join category labels
  const catMap = await getCategoryMap();
  return txs.map((t) => ({
    ...t,
    category_label: catMap.get(t.category_id) || t.category_label || 'อื่น ๆ',
  }));
}

async function getCategoryMap() {
  return withIDBStore('categories', 'readonly', ({ store, useLS, data }) => {
    if (useLS || data) {
      return new Map((data.categories || []).map((c) => [c.id, c.label]));
    }
    if (!store) return new Map();
    return new Promise((res) => {
      const req = store.getAll();
      req.onsuccess = () => res(new Map((req.result || []).map((c) => [c.id, c.label])));
      req.onerror = () => res(new Map());
    });
  });
}

async function getCategoryLabel(id) {
  const map = await getCategoryMap();
  return map.get(id) || 'อื่น ๆ';
}

function categorize(transaction, rules) {
  if (transaction.amountSatang > 0) return 'cat-income';
  const title = normalizeTitle(transaction.title);
  const match = (rules || []).find((rule) => {
    try {
      return new RegExp(rule.pattern, 'i').test(title);
    } catch {
      return false;
    }
  });
  return match?.category_id || match?.categoryId || 'cat-other';
}

async function getRules() {
  return withIDBStore('category_rules', 'readonly', ({ store, useLS, data }) => {
    if (useLS || data) {
      return (data.category_rules || []).sort((a, b) => (b.priority || 0) - (a.priority || 0) || (a.id || 0) - (b.id || 0));
    }
    if (!store) return [];
    return new Promise((res) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const list = req.result || [];
        list.sort((a, b) => (b.priority || 0) - (a.priority || 0) || (a.id || 0) - (b.id || 0));
        res(list);
      };
      req.onerror = () => res([]);
    });
  });
}

// --- Category & Rule management (public CRUD, safe for existing data) ---
async function getCategories() {
  await init();
  return withIDBStore('categories', 'readonly', ({ store, useLS, data }) => {
    if (useLS || data) {
      return [...(data.categories || [])].sort((a, b) => (a.label || '').localeCompare(b.label || '', 'th-TH'));
    }
    if (!store) return [];
    return new Promise((res) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const list = req.result || [];
        list.sort((a, b) => (a.label || '').localeCompare(b.label || '', 'th-TH'));
        res(list);
      };
      req.onerror = () => res([]);
    });
  });
}

function sanitizeCategoryPayload(payload = {}) {
  const label = String(payload.label || '').trim();
  if (!label) throw new Error('กรุณาระบุชื่อหมวดหมู่');
  return { label };
}

async function createCategory(payload = {}) {
  await init();
  const cat = sanitizeCategoryPayload(payload);
  // duplicate label check (case-insensitive for Thai friendliness)
  const existing = await withIDBStore('categories', 'readonly', ({ store, useLS, data }) => {
    if (useLS || data) {
      return (data.categories || []).find((c) => (c.label || '').toLowerCase() === cat.label.toLowerCase());
    }
    if (!store) return null;
    return new Promise((res) => {
      const req = store.getAll();
      req.onsuccess = () => res((req.result || []).find((c) => (c.label || '').toLowerCase() === cat.label.toLowerCase()) || null);
      req.onerror = () => res(null);
    });
  });
  if (existing) throw new Error('มีหมวดหมู่นี้แล้ว');

  const id = `cat-user-${cryptoRandomId().slice(0, 10)}`;
  const record = { id, label: cat.label };

  await withIDBStore('categories', 'readwrite', ({ store, useLS, data }) => {
    if (useLS || data) {
      data.categories = data.categories || [];
      data.categories.push(record);
      return { _write: true, data };
    }
    if (!store) return;
    store.add(record);
  });
  return record;
}

async function updateCategory(id, payload = {}) {
  await init();
  const cat = sanitizeCategoryPayload(payload);
  const existing = await withIDBStore('categories', 'readonly', ({ store, useLS, data }) => {
    if (useLS || data) return (data.categories || []).find((c) => c.id === id);
    if (!store) return null;
    return new Promise((res) => { const r = store.get(id); r.onsuccess = () => res(r.result); r.onerror = () => res(null); });
  });
  if (!existing) throw new Error('ไม่พบหมวดหมู่ที่ต้องการแก้ไข');

  const updated = { ...existing, label: cat.label };
  await withIDBStore('categories', 'readwrite', ({ store, useLS, data }) => {
    if (useLS || data) {
      data.categories = (data.categories || []).map((c) => (c.id === id ? updated : c));
      return { _write: true, data };
    }
    if (!store) return;
    store.put(updated);
  });
  return updated;
}

async function deleteCategory(id) {
  await init();
  // Safety: block if referenced by transactions or budgets (protect user data)
  const txCount = await withIDBStore('transactions', 'readonly', ({ store, useLS, data }) => {
    if (useLS || data) return (data.transactions || []).filter((t) => t.category_id === id).length;
    if (!store) return 0;
    return new Promise((res) => {
      const idx = store.index('account_id'); // no cat index, full scan ok (small data)
      const req = store.getAll();
      req.onsuccess = () => res((req.result || []).filter((t) => t.category_id === id).length);
      req.onerror = () => res(0);
    });
  });
  const budgetCount = await withIDBStore('budgets', 'readonly', ({ store, useLS, data }) => {
    if (useLS || data) return (data.budgets || []).filter((b) => b.category_id === id).length;
    if (!store) return 0;
    return new Promise((res) => {
      const req = store.getAll();
      req.onsuccess = () => res((req.result || []).filter((b) => b.category_id === id).length);
      req.onerror = () => res(0);
    });
  });
  if (txCount > 0 || budgetCount > 0) {
    throw new Error('ลบหมวดหมู่ไม่ได้ เนื่องจากมีธุรกรรมหรืองบประมาณใช้หมวดนี้อยู่');
  }

  await withIDBStore('categories', 'readwrite', ({ store, useLS, data }) => {
    if (useLS || data) {
      data.categories = (data.categories || []).filter((c) => c.id !== id);
      return { _write: true, data };
    }
    if (!store) return;
    store.delete(id);
  });
  return { deleted: true };
}

async function getCategoryRules() {
  return getRules();
}

async function createCategoryRule(payload = {}) {
  await init();
  const pattern = String(payload.pattern || '').trim();
  if (!pattern) throw new Error('กรุณาระบุรูปแบบข้อความ (pattern) สำหรับกฎ');
  const categoryId = String(payload.category_id || payload.categoryId || '').trim();
  if (!categoryId) throw new Error('กรุณาเลือกหมวดหมู่สำหรับกฎ');
  const priority = Number.isFinite(payload.priority) ? Math.max(0, Math.min(1000, Math.round(payload.priority))) : 50;

  // Verify category exists
  const cats = await getCategories();
  if (!cats.some((c) => c.id === categoryId)) throw new Error('ไม่พบหมวดหมู่ที่เลือก');

  const id = `rule-${cryptoRandomId()}`;
  const record = {
    id,
    pattern,
    category_id: categoryId,
    priority,
    created_at: nowIso(),
  };

  await withIDBStore('category_rules', 'readwrite', ({ store, useLS, data }) => {
    if (useLS || data) {
      data.category_rules = data.category_rules || [];
      data.category_rules.push(record);
      return { _write: true, data };
    }
    if (!store) return;
    // IDB: use put with provided string id (safe, autoIncrement only for missing keys)
    store.put(record);
  });
  return record;
}

async function updateCategoryRule(id, payload = {}) {
  await init();
  const existing = await withIDBStore('category_rules', 'readonly', ({ store, useLS, data }) => {
    if (useLS || data) return (data.category_rules || []).find((r) => r.id === id);
    if (!store) return null;
    return new Promise((res) => { const r = store.get(id); r.onsuccess = () => res(r.result); r.onerror = () => res(null); });
  });
  if (!existing) throw new Error('ไม่พบกฎที่ต้องการแก้ไข');

  const pattern = payload.pattern != null ? String(payload.pattern).trim() : existing.pattern;
  const categoryId = payload.category_id || payload.categoryId ? String(payload.category_id || payload.categoryId).trim() : existing.category_id;
  const priority = payload.priority != null && Number.isFinite(payload.priority) ? Math.max(0, Math.min(1000, Math.round(payload.priority))) : existing.priority;

  if (!pattern) throw new Error('รูปแบบข้อความ (pattern) ต้องไม่ว่าง');
  const cats = await getCategories();
  if (!cats.some((c) => c.id === categoryId)) throw new Error('ไม่พบหมวดหมู่ที่เลือก');

  const updated = { ...existing, pattern, category_id: categoryId, priority, updated_at: nowIso() };
  await withIDBStore('category_rules', 'readwrite', ({ store, useLS, data }) => {
    if (useLS || data) {
      data.category_rules = (data.category_rules || []).map((r) => (r.id === id ? updated : r));
      return { _write: true, data };
    }
    if (!store) return;
    store.put(updated);
  });
  return updated;
}

async function deleteCategoryRule(id) {
  await init();
  await withIDBStore('category_rules', 'readwrite', ({ store, useLS, data }) => {
    if (useLS || data) {
      data.category_rules = (data.category_rules || []).filter((r) => r.id !== id);
      return { _write: true, data };
    }
    if (!store) return;
    store.delete(id);
  });
  return { deleted: true };
}

async function updateTransactionCategory(txId, categoryId) {
  await init();
  if (!txId || !categoryId) throw new Error('ข้อมูลไม่ครบถ้วน');
  const label = await getCategoryLabel(categoryId);

  await withIDBStore('transactions', 'readwrite', ({ store, useLS, data }) => {
    if (useLS || data) {
      const tx = (data.transactions || []).find((t) => t.id === txId);
      if (tx) {
        tx.category_id = categoryId;
        tx.category_label = label;
        tx.category_source = 'manual';
        tx.updated_at = nowIso();
      }
      return { _write: true, data };
    }
    if (!store) return;
    const getReq = store.get(txId);
    getReq.onsuccess = () => {
      if (getReq.result) {
        const tx = getReq.result;
        tx.category_id = categoryId;
        tx.category_label = label;
        tx.category_source = 'manual';
        tx.updated_at = nowIso();
        store.put(tx);
      }
    };
  });

  return { success: true, category_id: categoryId, category_label: label };
}

async function recategorizeTransactions({ force = false } = {}) {
  await init();
  const rules = await getRules();
  const catMap = await getCategoryMap();
  let updatedCount = 0;
  let skippedManual = 0;

  // Load all transactions for processing (small local dataset)
  const allTx = await withIDBStore('transactions', 'readonly', ({ store, useLS, data }) => {
    if (useLS || data) return [...(data.transactions || [])];
    if (!store) return [];
    return new Promise((res) => {
      const req = store.getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => res([]);
    });
  });

  for (const tx of allTx) {
    if (!force && (tx.category_source === 'manual')) {
      skippedManual += 1;
      continue;
    }
    const newCatId = categorize({ title: tx.title, amountSatang: tx.amount }, rules);
    if (newCatId && newCatId !== tx.category_id) {
      const newLabel = catMap.get(newCatId) || 'อื่น ๆ';
      await withIDBStore('transactions', 'readwrite', ({ store, useLS, data }) => {
        if (useLS || data) {
          const t = (data.transactions || []).find((x) => x.id === tx.id);
          if (t) {
            t.category_id = newCatId;
            t.category_label = newLabel;
            t.category_source = 'rule';
            t.updated_at = nowIso();
          }
          return { _write: true, data };
        }
        if (!store) return;
        const g = store.get(tx.id);
        g.onsuccess = () => {
          if (g.result) {
            g.result.category_id = newCatId;
            g.result.category_label = newLabel;
            g.result.category_source = 'rule';
            g.result.updated_at = nowIso();
            store.put(g.result);
          }
        };
      });
      updatedCount += 1;
    }
  }

  return { updated: updatedCount, skippedManual, total: allTx.length };
}

// --- end category/rule management ---

async function importTransactions({ parsed, accountId }) {
  await init();
  if (!accountId) throw new Error('กรุณาเลือกบัญชีปลายทาง');

  const account = await withIDBStore('accounts', 'readonly', ({ store, useLS, data }) => {
    if (useLS || data) return (data.accounts || []).find((a) => a.id === accountId);
    if (!store) return null;
    return new Promise((res) => { const r = store.get(accountId); r.onsuccess = () => res(r.result); r.onerror = () => res(null); });
  });
  if (!account) throw new Error('ไม่พบบัญชีปลายทางสำหรับนำเข้า');

  const rules = await getRules();
  const catMap = await getCategoryMap();

  let imported = 0;
  let skipped = 0;
  let insertedAmount = 0;
  const importedAt = nowIso();
  const batchId = cryptoRandomId();

  // create batch record (light)
  await withIDBStore('import_batches', 'readwrite', ({ store, useLS, data }) => {
    const rec = {
      id: batchId,
      file_name: parsed.fileName || 'upload',
      file_path: '', // browser has no path
      account_id: accountId,
      encoding_used: parsed.encoding || 'UTF-8',
      detected_bank: parsed.detectedBank || 'อัตโนมัติ',
      total_rows: parsed.transactions.length,
      imported_count: 0,
      skipped_count: 0,
      created_at: importedAt,
    };
    if (useLS || data) {
      data.import_batches = data.import_batches || [];
      data.import_batches.push(rec);
      return { _write: true, data };
    }
    if (!store) return;
    store.add(rec);
  });

  for (const tx of parsed.transactions) {
    const fp = createFingerprint(accountId, tx);
    const txId = `tx-${fp}`;

    const exists = await withIDBStore('transactions', 'readonly', ({ store, useLS, data }) => {
      if (useLS || data) return (data.transactions || []).some((t) => t.fingerprint === fp);
      if (!store) return false;
      return new Promise((res) => {
        const idx = store.index('fingerprint');
        const req = idx.get(fp);
        req.onsuccess = () => res(!!req.result);
        req.onerror = () => res(false);
      });
    });

    if (exists) {
      skipped += 1;
      continue;
    }

    const categoryId = categorize(tx, rules);
    const income = tx.amountSatang > 0 ? tx.amountSatang : 0;
    const expense = tx.amountSatang < 0 ? Math.abs(tx.amountSatang) : 0;

    const record = {
      id: txId,
      fingerprint: fp,
      account_id: accountId,
      batch_id: batchId,
      date: tx.date || importedAt.slice(0, 10),
      title: tx.title,
      category_id: categoryId,
      source: 'statement',
      income,
      expense,
      amount: tx.amountSatang,
      raw_amount: tx.amount,
      raw_row: tx.rowNumber,
      imported_at: importedAt,
      category_label: catMap.get(categoryId) || 'อื่น ๆ',
    };

    await withIDBStore('transactions', 'readwrite', ({ store, useLS, data }) => {
      if (useLS || data) {
        data.transactions = data.transactions || [];
        data.transactions.push(record);
        return { _write: true, data };
      }
      if (!store) return;
      store.add(record);
    });

    insertedAmount += tx.amountSatang;
    imported += 1;
  }

  // update batch counts
  await withIDBStore('import_batches', 'readwrite', ({ store, useLS, data }) => {
    if (useLS || data) {
      const b = (data.import_batches || []).find((x) => x.id === batchId);
      if (b) { b.imported_count = imported; b.skipped_count = skipped; }
      return { _write: true, data };
    }
    if (!store) return;
    const getB = store.get(batchId);
    getB.onsuccess = () => {
      if (getB.result) {
        getB.result.imported_count = imported;
        getB.result.skipped_count = skipped;
        store.put(getB.result);
      }
    };
  });

  // update account balance
  if (insertedAmount !== 0) {
    await withIDBStore('accounts', 'readwrite', ({ store, useLS, data }) => {
      if (useLS || data) {
        const acc = (data.accounts || []).find((a) => a.id === accountId);
        if (acc) {
          acc.current_balance = (acc.current_balance || 0) + insertedAmount;
          acc.updated_at = importedAt;
        }
        return { _write: true, data };
      }
      if (!store) return;
      const getA = store.get(accountId);
      getA.onsuccess = () => {
        if (getA.result) {
          getA.result.current_balance = (getA.result.current_balance || 0) + insertedAmount;
          getA.result.updated_at = importedAt;
          store.put(getA.result);
        }
      };
    });
  }

  return { batchId, imported, skipped, total: parsed.transactions.length };
}

async function exportTransactions() {
  await init();
  const txs = await getTransactions();
  if (!txs.length) {
    throw new Error('ยังไม่มีธุรกรรมสำหรับ export');
  }

  const accounts = await getAccounts();
  const accMap = new Map(accounts.map((a) => [a.id, a]));

  const header = ['date', 'title', 'category', 'account', 'institution', 'income_thb', 'expense_thb', 'source'];
  const lines = txs.map((row) => {
    const acc = accMap.get(row.account_id);
    const cells = [
      row.date,
      row.title,
      row.category_label || '',
      acc?.name || row.account_id,
      acc?.institution || '',
      (row.income || 0) / 100,
      (row.expense || 0) / 100,
      row.source || 'statement',
    ];
    return cells.map((v) => {
      const s = String(v ?? '');
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',');
  });

  const csv = '\uFEFF' + header.join(',') + '\n' + lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fname = `findash-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.href = url;
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);

  return { success: true, count: txs.length, fileName: fname };
}

// helper
function cryptoRandomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function getStoreInfo() {
  await init();
  return {
    mode: fallbackMode,
    dbName: DB_NAME,
    version: DB_VERSION,
  };
}

// Public surface (used by App.jsx + ImportPanel.jsx)
const financeStore = {
  init,
  getStoreInfo,

  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,

  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,

  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,

  getUserProfile,
  updateUserProfile,

  getTransactions,
  importTransactions,
  exportTransactions,

  // Category & rule management (new)
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryRules,
  createCategoryRule,
  updateCategoryRule,
  deleteCategoryRule,
  updateTransactionCategory,
  recategorizeTransactions,

  // For ImportPanel preview path
  async previewImport(file, _accountId) {
    const { parseStatementFile } = await import('./statementParser.js');
    const parsed = await parseStatementFile(file);
    // enrich preview with categorization (first N)
    const rules = await getRules();
    const catMap = await getCategoryMap();
    const preview = parsed.transactions.slice(0, 20).map((t) => {
      const catId = categorize(t, rules);
      return {
        ...t,
        category_id: catId,
        category_label: catMap.get(catId) || 'อื่น ๆ',
      };
    });
    return {
      success: true,
      count: parsed.count,
      encoding_used: parsed.encoding,
      detected_bank: parsed.detectedBank,
      file_name: parsed.fileName,
      transactions: preview,
    };
  },

  async importFromFile(file, accountId) {
    const { parseStatementFile } = await import('./statementParser.js');
    const parsed = await parseStatementFile(file);
    const result = await importTransactions({ parsed, accountId });
    return {
      success: true,
      ...result,
      encoding_used: parsed.encoding,
      detected_bank: parsed.detectedBank,
    };
  },
};

export default financeStore;
