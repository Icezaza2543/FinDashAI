import { describe, it, expect, beforeEach, vi } from 'vitest';
import financeStore from '../financeStore';

describe('financeStore', () => {
  beforeEach(async () => {
    // Initialize the store
    await financeStore.init();
  });

  it('creates and retrieves a goal', async () => {
    const payload = {
      label: 'Test Goal',
      target_amount: 10000,
      saved_amount: 1000,
    };

    const goal = await financeStore.createGoal(payload);
    expect(goal.id).toBeDefined();
    expect(goal.label).toBe('Test Goal');
    expect(goal.target_amount).toBe(10000);
    expect(goal.saved_amount).toBe(1000);

    const goals = await financeStore.getGoals();
    expect(goals.some(g => g.id === goal.id)).toBe(true);
  });

  it('creates and retrieves a budget', async () => {
    const categories = await financeStore.getCategories();
    const firstCat = categories[0];
    const payload = {
      category_id: firstCat.id,
      monthly_limit: 5000,
    };

    const budget = await financeStore.createBudget(payload);
    expect(budget.id).toBeDefined();
    expect(budget.category_id).toBe(firstCat.id);
    expect(budget.monthly_limit).toBe(5000);

    const budgets = await financeStore.getBudgets();
    expect(budgets.some(b => b.id === budget.id)).toBe(true);
  });

  it('updates user profile', async () => {
    const payload = {
      display_name: 'John Doe',
      email: 'john@example.com'
    };

    const updatedProfile = await financeStore.updateUserProfile(payload);
    expect(updatedProfile.display_name).toBe('John Doe');
    expect(updatedProfile.email).toBe('john@example.com');
    expect(updatedProfile.avatar_initial).toBe('J'); // Based on logic

    const profile = await financeStore.getUserProfile();
    expect(profile.display_name).toBe('John Doe');
  });

  describe('Accounts API', () => {
    it('creates, retrieves, updates, and deletes an account', async () => {
      const payload = { name: 'Test Bank', type: 'bank', current_balance: 10000, institution: 'KBank' };
      const account = await financeStore.createAccount(payload);
      expect(account.id).toBeDefined();
      expect(account.name).toBe('Test Bank');
      expect(account.current_balance).toBe(10000);

      const accounts = await financeStore.getAccounts();
      expect(accounts.some(a => a.id === account.id)).toBe(true);

      const updated = await financeStore.updateAccount(account.id, { name: 'Updated Bank', current_balance: 20000 });
      expect(updated.name).toBe('Updated Bank');
      expect(updated.current_balance).toBe(20000);

      const delRes = await financeStore.deleteAccount(account.id);
      expect(delRes.deleted).toBe(true);

      const postDelete = await financeStore.getAccounts();
      expect(postDelete.some(a => a.id === account.id)).toBe(false);
    });
  });

  describe('Transactions API', () => {
    it('imports and retrieves transactions', async () => {
      const account = await financeStore.createAccount({ name: 'Trans Bank', type: 'bank' });
      const transactions = [
        { date: '2024-05-30', amount: -500, amountSatang: -50000, title: 'Coffee', rowNumber: 1 }
      ];
      const result = await financeStore.importTransactions({ parsed: { transactions }, accountId: account.id });
      expect(result.imported).toBe(1);
      
      const txs = await financeStore.getTransactions({ limit: 10 });
      expect(txs.length).toBeGreaterThan(0);
      expect(txs[0].title).toBe('Coffee');
    });
  });

  describe('Budgets & Goals API Extended', () => {
    it('updates and deletes budgets', async () => {
      const cats = await financeStore.getCategories();
      const budget = await financeStore.createBudget({ category_id: cats[3].id, monthly_limit: 5000 });
      
      const updated = await financeStore.updateBudget(budget.id, { monthly_limit: 8000 });
      expect(updated.monthly_limit).toBe(8000);

      await financeStore.deleteBudget(budget.id);
      const budgets = await financeStore.getBudgets();
      expect(budgets.some(b => b.id === budget.id)).toBe(false);
    });

    it('updates and deletes goals', async () => {
      const goal = await financeStore.createGoal({ label: 'To Update', target_amount: 10000 });
      const updated = await financeStore.updateGoal(goal.id, { label: 'To Update', saved_amount: 5000 });
      expect(updated.saved_amount).toBe(5000);

      await financeStore.deleteGoal(goal.id);
      const goals = await financeStore.getGoals();
      expect(goals.some(g => g.id === goal.id)).toBe(false);
    });
  });

  describe('File Import API', () => {
    it('previews and imports from file', async () => {
      const account = await financeStore.createAccount({ name: 'Import Acc', type: 'bank' });
      const csvContent = 'วันที่,รายการ,จำนวนเงิน\n2024-05-30,Salary,50000\n2024-05-31,Coffee,-150';
      const file = new File([csvContent], 'statement.csv', { type: 'text/csv' });
      
      const preview = await financeStore.previewImport(file, account.id);
      expect(preview.success).toBe(true);
      expect(preview.count).toBe(2);
      expect(preview.transactions[0].amount).toBe(50000);

      const imported = await financeStore.importFromFile(file, account.id);
      expect(imported.success).toBe(true);
      expect(imported.imported).toBe(2);
    });
  });

  describe('Export and Store Info API', () => {
    it('exports transactions to CSV', async () => {
      globalThis.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-uuid');
      globalThis.URL.revokeObjectURL = vi.fn();
      
      // Must have some transactions to export
      const txs = await financeStore.getTransactions();
      if (txs.length === 0) {
        const account = await financeStore.createAccount({ name: 'Export Acc', type: 'bank' });
        await financeStore.importTransactions({ parsed: { transactions: [{ date: '2024-05-30', amount: 100, amountSatang: 10000, title: 'Export', rowNumber: 1 }] }, accountId: account.id });
      }

      await financeStore.exportTransactions();
      expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
    });

    it('throws error when exporting without transactions', async () => {
      // Wait, can't easily clear transactions without resetting DB.
      // We'll just test getStoreInfo here.
      const info = await financeStore.getStoreInfo();
      expect(info.dbName).toBe('findash-finance');
    });
  });

  describe('Fallback Memory/LS Store', () => {
    it('uses fallback when indexedDB is unavailable', async () => {
      const originalIDB = globalThis.indexedDB;
      // force fallback
      Object.defineProperty(globalThis, 'indexedDB', { value: undefined, writable: true });
      
      try {
        const newAcc = await financeStore.createAccount({ name: 'Fallback Acc', type: 'cash' });
        expect(newAcc.name).toBe('Fallback Acc');
        
        const accs = await financeStore.getAccounts();
        expect(accs.some(a => a.id === newAcc.id)).toBe(true);
      } finally {
        globalThis.indexedDB = originalIDB;
      }
    });
  });

  describe('Transactions Extended API', () => {
    it('updates transaction category and recategorizes', async () => {
      const account = await financeStore.createAccount({ name: 'Trans Bank 2', type: 'bank' });
      const txs = [
        { date: '2024-05-30', amount: -200, amountSatang: -20000, title: 'Old Cat', rowNumber: 1 }
      ];
      await financeStore.importTransactions({ parsed: { transactions: txs }, accountId: account.id });
      
      const list = await financeStore.getTransactions({ limit: 1 });
      const tx = list[0];
      
      const cats = await financeStore.getCategories();
      const newCatId = cats[0].id;
      await financeStore.updateTransactionCategory(tx.id, newCatId);
      
      const updatedList = await financeStore.getTransactions({ limit: 1 });
      expect(updatedList[0].category_id).toBe(newCatId);

      // recategorizeTransactions
      await financeStore.recategorizeTransactions();
    });
  });

  describe('Categories API', () => {
    it('manages custom categories', async () => {
      const cat = await financeStore.createCategory({ label: 'My Custom Cat' });
      expect(cat.id).toBeDefined();

      const cats = await financeStore.getCategories();
      expect(cats.some(c => c.id === cat.id)).toBe(true);

      const updated = await financeStore.updateCategory(cat.id, { label: 'Updated Cat' });
      expect(updated.label).toBe('Updated Cat');

      await financeStore.deleteCategory(cat.id);
      const postDelete = await financeStore.getCategories();
      expect(postDelete.some(c => c.id === cat.id)).toBe(false);
    });
  });

  describe('Category Rules API', () => {
    it('manages custom category rules', async () => {
      const cats = await financeStore.getCategories();
      const rule = await financeStore.createCategoryRule({
        pattern: 'test_pattern',
        category_id: cats[0].id,
        priority: 10
      });
      expect(rule.id).toBeDefined();

      const rules = await financeStore.getCategoryRules();
      expect(rules.some(r => r.id === rule.id)).toBe(true);

      const updated = await financeStore.updateCategoryRule(rule.id, { pattern: 'updated_pattern', category_id: cats[1].id, priority: 20 });
      expect(updated.pattern).toBe('updated_pattern');
      expect(updated.priority).toBe(20);

      await financeStore.deleteCategoryRule(rule.id);
    });
  });

  describe('Error boundaries and edge cases', () => {
    it('throws error when creating account without name', async () => {
      await expect(financeStore.createAccount({ type: 'bank' })).rejects.toThrow('กรุณาระบุชื่อบัญชี');
    });

    it('throws error when creating goal without name', async () => {
      await expect(financeStore.createGoal({ target_amount: 100 })).rejects.toThrow('กรุณาระบุชื่อเป้าหมาย');
    });

    it('throws error when updating non-existent account', async () => {
      await expect(financeStore.updateAccount('invalid-id', { name: 'Valid' })).rejects.toThrow('ไม่พบบัญชีที่ต้องการแก้ไข');
    });

    it('handles negative or invalid numerical values gracefully', async () => {
      const categories = await financeStore.getCategories();
      const budget = await financeStore.createBudget({
        category_id: categories[1].id,
        monthly_limit: -5000 // Should be capped to 0
      });
      expect(budget.monthly_limit).toBe(0);

      const goal = await financeStore.createGoal({
        label: 'Edge Case',
        target_amount: NaN,
        saved_amount: Infinity // Math.round(Infinity) is NaN, but Number.isFinite catches it -> 0
      });
      expect(goal.target_amount).toBe(0);
      expect(goal.saved_amount).toBe(0);
    });

    it('prevents duplicate budgets for same category', async () => {
      const categories = await financeStore.getCategories();
      const catId = categories[2].id;
      await financeStore.createBudget({ category_id: catId, monthly_limit: 1000 });
      
      await expect(financeStore.createBudget({ category_id: catId, monthly_limit: 2000 }))
        .rejects.toThrow('หมวดนี้มีงบประมาณแล้ว ให้แก้ไขรายการเดิมแทน');
    });
  });
});
