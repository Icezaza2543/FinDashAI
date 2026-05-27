const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

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
  { pattern: 'big c|บิ๊กซี|lotus|โลตัส|tops|foodland|makro|7-eleven|เซเว่น|cafe|amazon|starbucks', categoryId: 'cat-food', priority: 80 },
  { pattern: 'rent|ค่าเช่า|condo|คอนโด', categoryId: 'cat-housing', priority: 80 },
  { pattern: 'grab|bolt|taxi|bts|mrt|รถไฟฟ้า|น้ำมัน|ptt|shell', categoryId: 'cat-transport', priority: 75 },
  { pattern: 'water|ไฟฟ้า|ค่าไฟ|ค่าน้ำ|internet|โทรศัพท์|ประปา', categoryId: 'cat-utility', priority: 75 },
  { pattern: 'shopee|lazada|central|mall|uniqlo|zara', categoryId: 'cat-shopping', priority: 70 },
  { pattern: 'hospital|clinic|pharmacy|ร้านยา|โรงพยาบาล|คลินิก', categoryId: 'cat-health', priority: 70 },
  { pattern: 'netflix|spotify|cinema|movie|major|concert', categoryId: 'cat-entertainment', priority: 65 },
];

const LEGACY_ACCOUNT_IDS = ['salary', 'spending', 'credit'];

let db;

function nowIso() {
  return new Date().toISOString();
}

function normalizeTitle(title) {
  return String(title || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function createFingerprint(accountId, transaction) {
  return crypto
    .createHash('sha256')
    .update([
      accountId,
      transaction.date || '',
      normalizeTitle(transaction.title),
      transaction.amountSatang,
    ].join('|'))
    .digest('hex');
}

function getDb() {
  if (!db) {
    throw new Error('Database is not initialized');
  }
  return db;
}

function initDatabase(userDataPath) {
  const dbPath = path.join(userDataPath, 'findash.sqlite');
  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  migrate();
  seedDefaults();
  return dbPath;
}

function migrate() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      institution TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'bank',
      current_balance INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      display_name TEXT NOT NULL DEFAULT '',
      avatar_initial TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS category_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern TEXT NOT NULL,
      category_id TEXT NOT NULL REFERENCES categories(id),
      priority INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL UNIQUE REFERENCES categories(id),
      monthly_limit INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      target_amount INTEGER NOT NULL DEFAULT 0,
      saved_amount INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS import_batches (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      encoding_used TEXT NOT NULL,
      detected_bank TEXT NOT NULL,
      total_rows INTEGER NOT NULL DEFAULT 0,
      imported_count INTEGER NOT NULL DEFAULT 0,
      skipped_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      fingerprint TEXT NOT NULL UNIQUE,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      batch_id TEXT REFERENCES import_batches(id),
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      category_id TEXT NOT NULL REFERENCES categories(id),
      source TEXT NOT NULL DEFAULT 'statement',
      income INTEGER NOT NULL DEFAULT 0,
      expense INTEGER NOT NULL DEFAULT 0,
      amount INTEGER NOT NULL DEFAULT 0,
      raw_amount REAL NOT NULL DEFAULT 0,
      raw_row INTEGER,
      imported_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
  `);

  ensureColumn('accounts', 'institution', "TEXT NOT NULL DEFAULT ''");
  ensureColumn('user_profile', 'email', "TEXT NOT NULL DEFAULT ''");
}

function ensureColumn(tableName, columnName, definition) {
  const columns = getDb().prepare(`PRAGMA table_info(${tableName})`).all();
  if (!columns.some((column) => column.name === columnName)) {
    getDb().exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function seedDefaults() {
  const categoryStmt = getDb().prepare('INSERT OR IGNORE INTO categories (id, label) VALUES (?, ?)');
  DEFAULT_CATEGORIES.forEach((category) => categoryStmt.run(category.id, category.label));

  const existingRules = getDb().prepare('SELECT COUNT(*) AS count FROM category_rules').get().count;
  if (existingRules === 0) {
    const ruleStmt = getDb().prepare('INSERT INTO category_rules (pattern, category_id, priority) VALUES (?, ?, ?)');
    DEFAULT_RULES.forEach((rule) => ruleStmt.run(rule.pattern, rule.categoryId, rule.priority));
  }

  getDb().prepare(`
    INSERT OR IGNORE INTO user_profile (id, display_name, avatar_initial, email, created_at, updated_at)
    VALUES (1, '', '', '', ?, ?)
  `).run(nowIso(), nowIso());

  cleanupLegacyMockAccounts();
}

function cleanupLegacyMockAccounts() {
  const txCountStmt = getDb().prepare('SELECT COUNT(*) AS count FROM transactions WHERE account_id = ?');
  const batchCountStmt = getDb().prepare('SELECT COUNT(*) AS count FROM import_batches WHERE account_id = ?');
  const accountStmt = getDb().prepare('SELECT id, current_balance FROM accounts WHERE id = ?');
  const deleteStmt = getDb().prepare('DELETE FROM accounts WHERE id = ?');

  LEGACY_ACCOUNT_IDS.forEach((id) => {
    const account = accountStmt.get(id);
    if (!account) return;

    const hasTransactions = txCountStmt.get(id).count > 0;
    const hasBatches = batchCountStmt.get(id).count > 0;
    if (!hasTransactions && !hasBatches && account.current_balance === 0) {
      deleteStmt.run(id);
    }
  });
}

function getAccounts() {
  return getDb().prepare(`
    SELECT id, name, institution, type, current_balance, created_at, updated_at
    FROM accounts
    ORDER BY created_at ASC, name ASC
  `).all();
}

function sanitizeAccountPayload(payload = {}) {
  const name = String(payload.name || '').trim();
  if (!name) {
    throw new Error('กรุณาระบุชื่อบัญชี');
  }

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

function createAccount(payload) {
  const account = sanitizeAccountPayload(payload);
  const timestamp = nowIso();
  const id = `acct-${crypto.randomUUID()}`;

  getDb().prepare(`
    INSERT INTO accounts (id, name, institution, type, current_balance, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, account.name, account.institution, account.type, account.current_balance, timestamp, timestamp);

  return getDb().prepare('SELECT id, name, institution, type, current_balance, created_at, updated_at FROM accounts WHERE id = ?').get(id);
}

function updateAccount(id, payload) {
  const account = sanitizeAccountPayload(payload);
  const existing = getDb().prepare('SELECT id FROM accounts WHERE id = ?').get(id);
  if (!existing) {
    throw new Error('ไม่พบบัญชีที่ต้องการแก้ไข');
  }

  getDb().prepare(`
    UPDATE accounts
    SET name = ?, institution = ?, type = ?, current_balance = ?, updated_at = ?
    WHERE id = ?
  `).run(account.name, account.institution, account.type, account.current_balance, nowIso(), id);

  return getDb().prepare('SELECT id, name, institution, type, current_balance, created_at, updated_at FROM accounts WHERE id = ?').get(id);
}

function deleteAccount(id) {
  const transactionCount = getDb().prepare('SELECT COUNT(*) AS count FROM transactions WHERE account_id = ?').get(id).count;
  const batchCount = getDb().prepare('SELECT COUNT(*) AS count FROM import_batches WHERE account_id = ?').get(id).count;
  if (transactionCount > 0 || batchCount > 0) {
    throw new Error('ลบบัญชีนี้ไม่ได้ เพราะมีธุรกรรมหรือประวัติการนำเข้าอยู่');
  }

  const result = getDb().prepare('DELETE FROM accounts WHERE id = ?').run(id);
  if (result.changes === 0) {
    throw new Error('ไม่พบบัญชีที่ต้องการลบ');
  }

  return { deleted: true };
}

function getBudgets() {
  return getDb().prepare(`
    SELECT
      budgets.id,
      budgets.category_id,
      budgets.monthly_limit,
      budgets.created_at,
      budgets.updated_at,
      categories.label AS category_label
    FROM budgets
    LEFT JOIN categories ON categories.id = budgets.category_id
    ORDER BY categories.label ASC
  `).all();
}

function sanitizeBudgetPayload(payload = {}) {
  const categoryId = String(payload.category_id || '').trim();
  const category = getDb().prepare('SELECT id FROM categories WHERE id = ?').get(categoryId);
  if (!category) {
    throw new Error('กรุณาเลือกหมวดหมู่งบประมาณ');
  }

  const monthlyLimit = Number(payload.monthly_limit);
  return {
    category_id: categoryId,
    monthly_limit: Number.isFinite(monthlyLimit) ? Math.max(0, Math.round(monthlyLimit)) : 0,
  };
}

function createBudget(payload) {
  const budget = sanitizeBudgetPayload(payload);
  const existing = getDb().prepare('SELECT id FROM budgets WHERE category_id = ?').get(budget.category_id);
  if (existing) {
    throw new Error('หมวดนี้มีงบประมาณแล้ว ให้แก้ไขรายการเดิมแทน');
  }

  const timestamp = nowIso();
  const id = `budget-${crypto.randomUUID()}`;

  getDb().prepare(`
    INSERT INTO budgets (id, category_id, monthly_limit, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, budget.category_id, budget.monthly_limit, timestamp, timestamp);

  return getBudgets().find((item) => item.id === id);
}

function updateBudget(id, payload) {
  const budget = sanitizeBudgetPayload(payload);
  const existing = getDb().prepare('SELECT id FROM budgets WHERE id = ?').get(id);
  if (!existing) {
    throw new Error('ไม่พบงบประมาณที่ต้องการแก้ไข');
  }

  const duplicate = getDb().prepare('SELECT id FROM budgets WHERE category_id = ? AND id <> ?').get(budget.category_id, id);
  if (duplicate) {
    throw new Error('หมวดนี้มีงบประมาณแล้ว ให้เลือกหมวดอื่น');
  }

  getDb().prepare(`
    UPDATE budgets
    SET category_id = ?, monthly_limit = ?, updated_at = ?
    WHERE id = ?
  `).run(budget.category_id, budget.monthly_limit, nowIso(), id);

  return getBudgets().find((item) => item.id === id);
}

function deleteBudget(id) {
  const result = getDb().prepare('DELETE FROM budgets WHERE id = ?').run(id);
  if (result.changes === 0) {
    throw new Error('ไม่พบงบประมาณที่ต้องการลบ');
  }

  return { deleted: true };
}

function getGoals() {
  return getDb().prepare(`
    SELECT id, label, target_amount, saved_amount, created_at, updated_at
    FROM goals
    ORDER BY created_at ASC, label ASC
  `).all();
}

function sanitizeGoalPayload(payload = {}) {
  const label = String(payload.label || '').trim();
  if (!label) {
    throw new Error('กรุณาระบุชื่อเป้าหมาย');
  }

  const targetAmount = Number(payload.target_amount);
  const savedAmount = Number(payload.saved_amount);
  return {
    label,
    target_amount: Number.isFinite(targetAmount) ? Math.max(0, Math.round(targetAmount)) : 0,
    saved_amount: Number.isFinite(savedAmount) ? Math.max(0, Math.round(savedAmount)) : 0,
  };
}

function createGoal(payload) {
  const goal = sanitizeGoalPayload(payload);
  const timestamp = nowIso();
  const id = `goal-${crypto.randomUUID()}`;

  getDb().prepare(`
    INSERT INTO goals (id, label, target_amount, saved_amount, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, goal.label, goal.target_amount, goal.saved_amount, timestamp, timestamp);

  return getDb().prepare('SELECT id, label, target_amount, saved_amount, created_at, updated_at FROM goals WHERE id = ?').get(id);
}

function updateGoal(id, payload) {
  const goal = sanitizeGoalPayload(payload);
  const existing = getDb().prepare('SELECT id FROM goals WHERE id = ?').get(id);
  if (!existing) {
    throw new Error('ไม่พบเป้าหมายที่ต้องการแก้ไข');
  }

  getDb().prepare(`
    UPDATE goals
    SET label = ?, target_amount = ?, saved_amount = ?, updated_at = ?
    WHERE id = ?
  `).run(goal.label, goal.target_amount, goal.saved_amount, nowIso(), id);

  return getDb().prepare('SELECT id, label, target_amount, saved_amount, created_at, updated_at FROM goals WHERE id = ?').get(id);
}

function deleteGoal(id) {
  const result = getDb().prepare('DELETE FROM goals WHERE id = ?').run(id);
  if (result.changes === 0) {
    throw new Error('ไม่พบเป้าหมายที่ต้องการลบ');
  }

  return { deleted: true };
}

function getUserProfile() {
  return getDb().prepare(`
    SELECT id, display_name, avatar_initial, email, created_at, updated_at
    FROM user_profile
    WHERE id = 1
  `).get() || {
    id: 1,
    display_name: '',
    avatar_initial: '',
    email: '',
    created_at: nowIso(),
    updated_at: nowIso(),
  };
}

function updateUserProfile(payload = {}) {
  const displayName = String(payload.display_name || '').trim();
  const avatarInitial = String(payload.avatar_initial || displayName.slice(0, 1) || '').trim().slice(0, 2);
  const email = String(payload.email || '').trim();
  const timestamp = nowIso();

  getDb().prepare(`
    INSERT INTO user_profile (id, display_name, avatar_initial, email, created_at, updated_at)
    VALUES (1, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      display_name = excluded.display_name,
      avatar_initial = excluded.avatar_initial,
      email = excluded.email,
      updated_at = excluded.updated_at
  `).run(displayName, avatarInitial, email, timestamp, timestamp);

  return getUserProfile();
}

function getTransactions() {
  return getDb().prepare(`
    SELECT
      transactions.id,
      transactions.account_id,
      transactions.date,
      transactions.title,
      transactions.category_id,
      transactions.source,
      transactions.income,
      transactions.expense,
      transactions.amount,
      transactions.imported_at,
      categories.label AS category_label
    FROM transactions
    LEFT JOIN categories ON categories.id = transactions.category_id
    ORDER BY transactions.date DESC, transactions.imported_at DESC
    LIMIT 1000
  `).all();
}

function categorize(transaction) {
  if (transaction.amountSatang > 0) {
    return 'cat-income';
  }

  const title = normalizeTitle(transaction.title);
  const rules = getDb().prepare(`
    SELECT pattern, category_id
    FROM category_rules
    ORDER BY priority DESC, id ASC
  `).all();

  const match = rules.find((rule) => {
    try {
      return new RegExp(rule.pattern, 'i').test(title);
    } catch {
      return false;
    }
  });

  return match?.category_id || 'cat-other';
}

function enrichForPreview(transactions) {
  return transactions.map((transaction) => {
    const categoryId = categorize(transaction);
    const category = getDb().prepare('SELECT label FROM categories WHERE id = ?').get(categoryId);
    return {
      ...transaction,
      category_id: categoryId,
      category_label: category?.label || 'อื่น ๆ',
    };
  });
}

function createBatch({ parsed, accountId }) {
  const batchId = crypto.randomUUID();
  getDb().prepare(`
    INSERT INTO import_batches (
      id, file_name, file_path, account_id, encoding_used, detected_bank,
      total_rows, imported_count, skipped_count, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
  `).run(
    batchId,
    parsed.fileName,
    parsed.filePath,
    accountId,
    parsed.encoding,
    parsed.detectedBank,
    parsed.transactions.length,
    nowIso(),
  );
  return batchId;
}

function importTransactions({ parsed, accountId }) {
  const account = getDb().prepare('SELECT id FROM accounts WHERE id = ?').get(accountId);
  if (!account) {
    throw new Error('ไม่พบบัญชีปลายทางสำหรับนำเข้า');
  }

  let imported = 0;
  let skipped = 0;
  let insertedAmount = 0;
  const importedAt = nowIso();

  getDb().exec('BEGIN');
  try {
    const batchId = createBatch({ parsed, accountId });
    const insertStmt = getDb().prepare(`
      INSERT OR IGNORE INTO transactions (
        id, fingerprint, account_id, batch_id, date, title, category_id, source,
        income, expense, amount, raw_amount, raw_row, imported_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'statement', ?, ?, ?, ?, ?, ?)
    `);

    parsed.transactions.forEach((transaction) => {
      const fingerprint = createFingerprint(accountId, transaction);
      const id = `tx-${fingerprint.slice(0, 24)}`;
      const categoryId = categorize(transaction);
      const income = transaction.amountSatang > 0 ? transaction.amountSatang : 0;
      const expense = transaction.amountSatang < 0 ? Math.abs(transaction.amountSatang) : 0;
      const result = insertStmt.run(
        id,
        fingerprint,
        accountId,
        batchId,
        transaction.date || importedAt.slice(0, 10),
        transaction.title,
        categoryId,
        income,
        expense,
        transaction.amountSatang,
        transaction.amount,
        transaction.rowNumber,
        importedAt,
      );

      if (result.changes > 0) {
        imported += 1;
        insertedAmount += transaction.amountSatang;
      } else {
        skipped += 1;
      }
    });

    getDb().prepare(`
      UPDATE import_batches
      SET imported_count = ?, skipped_count = ?
      WHERE id = ?
    `).run(imported, skipped, batchId);

    getDb().prepare(`
      UPDATE accounts
      SET current_balance = current_balance + ?, updated_at = ?
      WHERE id = ?
    `).run(insertedAmount, importedAt, accountId);

    getDb().exec('COMMIT');

    return {
      batchId,
      imported,
      skipped,
      total: parsed.transactions.length,
    };
  } catch (error) {
    getDb().exec('ROLLBACK');
    throw error;
  }
}

function closeDatabase() {
  if (db) {
    db.close();
    db = undefined;
  }
}

module.exports = {
  closeDatabase,
  createAccount,
  createBudget,
  createGoal,
  deleteAccount,
  deleteBudget,
  deleteGoal,
  enrichForPreview,
  getAccounts,
  getBudgets,
  getGoals,
  getTransactions,
  getUserProfile,
  importTransactions,
  initDatabase,
  updateAccount,
  updateBudget,
  updateGoal,
  updateUserProfile,
};
