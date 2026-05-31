import { useEffect, useMemo, useState } from "react";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import FilterBar from "./components/FilterBar";
import ImportPanel from "./components/ImportPanel";
import AccountStrip from "./components/AccountStrip";
import MetricGrid from "./components/MetricGrid";
import CashflowChart from "./components/CashflowChart";
import ExpenseDonut from "./components/ExpenseDonut";
import BudgetPanel from "./components/BudgetPanel";
import TransactionTable from "./components/TransactionTable";
import InsightPanel from "./components/InsightPanel";
import ProfitabilityPanel from "./components/ProfitabilityPanel";
import CategoryManager from "./components/CategoryManager";
import ReportsAnalytics from "./components/ReportsAnalytics";

import { ranges, navItems } from "./data/filters";
import { formatMoney } from "./utils/formatters";
import financeStore from "./lib/financeStore";

const CATEGORY_LABEL_MAP = {}; // dynamic from store now; keep for ultra-legacy fallback only

const EMPTY_ACCOUNT_DRAFT = {
  name: "",
  institution: "",
  type: "bank",
  current_balance: "0",
};

const EMPTY_BUDGET_DRAFT = {
  category_id: "cat-food",
  monthly_limit: "0",
};

const EMPTY_GOAL_DRAFT = {
  label: "",
  target_amount: "0",
  saved_amount: "0",
};

const ACCOUNT_TYPE_OPTIONS = [
  { id: "bank", label: "บัญชีธนาคาร" },
  { id: "credit", label: "บัตรเครดิต" },
  { id: "cash", label: "เงินสด" },
];

const ACCOUNT_TYPE_LABELS = {
  bank: "บัญชีธนาคาร",
  credit: "บัตรเครดิต",
  cash: "เงินสด",
};

// BUDGET_CATEGORY_OPTIONS removed - now dynamic from realCategories in renderBudgetForm

function bahtToSatang(value) {
  const amount = Number(String(value || "0").replace(/,/g, ""));
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function satangToBahtInput(value) {
  const amount = (Number(value) || 0) / 100;
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

function accountToDraft(account) {
  return {
    name: account.name || "",
    institution: account.institution || "",
    type: account.type || "bank",
    current_balance: satangToBahtInput(account.current_balance),
  };
}

function budgetToDraft(budget) {
  return {
    category_id: budget.category_id || "cat-food",
    monthly_limit: satangToBahtInput(budget.monthly_limit),
  };
}

function goalToDraft(goal) {
  return {
    label: goal.label || "",
    target_amount: satangToBahtInput(goal.target_amount),
    saved_amount: satangToBahtInput(goal.saved_amount),
  };
}

export default function App() {
  const [activeNav, setActiveNav] = useState("overview");
  const [range, setRange] = useState("all");
  const [account, setAccount] = useState("all");
  const [source, setSource] = useState("all");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [exportNote, setExportNote] = useState("");
  const [isGlobalLoading, setIsGlobalLoading] = useState(true);

  const [realAccounts, setRealAccounts] = useState([]);
  const [realBudgets, setRealBudgets] = useState([]);
  const [realGoals, setRealGoals] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [realCategories, setRealCategories] = useState([]);
  const [realRules, setRealRules] = useState([]);
  const [newAccountDraft, setNewAccountDraft] = useState(EMPTY_ACCOUNT_DRAFT);
  const [newBudgetDraft, setNewBudgetDraft] = useState(EMPTY_BUDGET_DRAFT);
  const [newGoalDraft, setNewGoalDraft] = useState(EMPTY_GOAL_DRAFT);
  const [accountDrafts, setAccountDrafts] = useState({});
  const [budgetDrafts, setBudgetDrafts] = useState({});
  const [goalDrafts, setGoalDrafts] = useState({});

  useEffect(() => {
    let isMounted = true;

    const loadRealData = async () => {
      try {
        const [accs, budgets, goals, txs, cats, rules] = await Promise.all([
          financeStore.getAccounts().catch(() => []),
          financeStore.getBudgets ? financeStore.getBudgets().catch(() => []) : Promise.resolve([]),
          financeStore.getGoals ? financeStore.getGoals().catch(() => []) : Promise.resolve([]),
          financeStore.getTransactions().catch(() => []),
          financeStore.getCategories ? financeStore.getCategories().catch(() => []) : Promise.resolve([]),
          financeStore.getCategoryRules ? financeStore.getCategoryRules().catch(() => []) : Promise.resolve([]),
        ]);

        if (isMounted) {
          setRealAccounts(accs || []);
          setRealBudgets(budgets || []);
          setRealGoals(goals || []);
          setAllTransactions(txs || []);
          setRealCategories(cats || []);
          setRealRules(rules || []);
          setIsGlobalLoading(false);
        }
      } catch (error) {
        console.warn("โหลดข้อมูลจาก local storage ไม่ได้", error);
        if (isMounted) {
          setRealAccounts([]);
          setRealBudgets([]);
          setRealGoals([]);
          setAllTransactions([]);
          setRealCategories([]);
          setRealRules([]);
          setIsGlobalLoading(false);
        }
      }
    };

    loadRealData();

    return () => {
      isMounted = false;
    };
  }, [refreshCount]);

  useEffect(() => {
    const nextDrafts = {};
    realAccounts.forEach((item) => {
      nextDrafts[item.id] = accountToDraft(item);
    });
    setAccountDrafts(nextDrafts);
  }, [realAccounts]);

  useEffect(() => {
    const nextDrafts = {};
    realBudgets.forEach((item) => {
      nextDrafts[item.id] = budgetToDraft(item);
    });
    setBudgetDrafts(nextDrafts);
  }, [realBudgets]);

  useEffect(() => {
    const nextDrafts = {};
    realGoals.forEach((item) => {
      nextDrafts[item.id] = goalToDraft(item);
    });
    setGoalDrafts(nextDrafts);
  }, [realGoals]);

  useEffect(() => {
    if (account !== "all" && !realAccounts.some((item) => item.id === account)) {
      setAccount("all");
    }
  }, [account, realAccounts]);

  const accountById = useMemo(
    () => new Map(realAccounts.map((item) => [item.id, item])),
    [realAccounts],
  );

  const accountFilterOptions = useMemo(
    () => [
      { id: "all", label: "บัญชีทั้งหมด" },
      ...realAccounts.map((item) => ({
        id: item.id,
        label: item.institution ? `${item.name} · ${item.institution}` : item.name,
      })),
    ],
    [realAccounts],
  );

  const activeRange = ranges.find((item) => item.id === range) ?? ranges[0];
  const activeNavLabel = navItems.find((item) => item.id === activeNav)?.label ?? "ภาพรวมการเงิน";
  const transactionCategoryOptions = useMemo(
    () => [
      { id: "all", label: "ทุกหมวดหมู่" },
      ...(realCategories.length > 0
        ? realCategories.map((item) => ({ id: item.id, label: item.label }))
        : [
            { id: "cat-income", label: "รายได้ประจำ" },
            { id: "cat-food", label: "อาหารและเครื่องดื่ม" },
            { id: "cat-housing", label: "ที่อยู่อาศัย" },
            { id: "cat-transport", label: "การเดินทาง" },
            { id: "cat-utility", label: "สาธารณูปโภค" },
            { id: "cat-shopping", label: "ช้อปปิ้ง" },
            { id: "cat-health", label: "สุขภาพ" },
            { id: "cat-entertainment", label: "ความบันเทิง" },
            { id: "cat-other", label: "อื่น ๆ" },
          ]),
    ],
    [realCategories],
  );

  const normalizedTransactions = useMemo(() => {
    const catMap = new Map(realCategories.map((c) => [c.id, c.label]));
    return allTransactions.map((transaction) => {
      const categoryLabel =
        transaction.category_label || catMap.get(transaction.category_id) || CATEGORY_LABEL_MAP[transaction.category_id] || "อื่น ๆ";
      const accountInfo = accountById.get(transaction.account_id);

      return {
        id: transaction.id,
        date: transaction.date,
        title: transaction.title,
        categoryId: transaction.category_id || "cat-other",
        category: transaction.category_id?.replace("cat-", "") || "other",
        categoryLabel,
        account: transaction.account_id,
        accountLabel: accountInfo?.name || transaction.account_id,
        source: transaction.source || "statement",
        income: transaction.income || 0,
        expense: transaction.expense || 0,
        balance: 0,
      };
    });
  }, [accountById, allTransactions, realCategories]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return normalizedTransactions.filter((row) => {
      const accountMatch = account === "all" || row.account === account;
      const sourceMatch = source === "all" || row.source === source;
      const categoryMatch = category === "all" || row.categoryId === category || row.category === category;
      const searchMatch =
        !query ||
        [row.title, row.categoryLabel, row.accountLabel, row.account, row.source].some((value) =>
          String(value || "").toLowerCase().includes(query),
        );

      return accountMatch && sourceMatch && categoryMatch && searchMatch;
    });
  }, [account, category, normalizedTransactions, search, source]);

  const analyticTransactions = filteredTransactions;

  const realMetrics = useMemo(() => {
    const filtered = normalizedTransactions.filter((row) => {
      const accountMatch = account === "all" || row.account === account;
      const sourceMatch = source === "all" || row.source === source;
      const categoryMatch = category === "all" || row.categoryId === category || row.category === category;
      return accountMatch && sourceMatch && categoryMatch;
    });

    const income = filtered.reduce((sum, row) => sum + (row.income || 0), 0);
    const expense = filtered.reduce((sum, row) => sum + (row.expense || 0), 0);
    const currentBalance =
      account === "all"
        ? realAccounts.reduce((sum, item) => sum + (item.current_balance || 0), 0)
        : accountById.get(account)?.current_balance || 0;
    const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

    return {
      income,
      expense,
      balance: currentBalance,
      savingsRate,
    };
  }, [account, accountById, category, normalizedTransactions, realAccounts, source]);

  const metrics = useMemo(
    () => ({
      income: realMetrics.income / 100,
      expense: realMetrics.expense / 100,
      balance: realMetrics.balance / 100,
      savingsRate: realMetrics.savingsRate,
    }),
    [realMetrics],
  );

  const showNote = (message, timeout = 2200) => {
    setExportNote(message);
    window.setTimeout(() => setExportNote(""), timeout);
  };

  const handleRefresh = () => {
    setRefreshCount((count) => count + 1);
    showNote("รีเฟรชข้อมูลจาก local storage แล้ว", 1800);
  };

  const handleImportComplete = () => {
    setRefreshCount((count) => count + 1);
    showNote("นำเข้า statement และอัปเดต Dashboard แล้ว");
  };

  const handleImportToggle = () => {
    if (activeNav !== "overview" && activeNav !== "transactions") {
      setActiveNav("transactions");
      setImportOpen(true);
      return;
    }

    setImportOpen((open) => !open);
  };

  const handleExport = async () => {
    try {
      const result = await financeStore.exportTransactions();
      if (result?.canceled) return;
      if (!result?.success) {
        showNote(result?.error || "Export ไม่สำเร็จ");
        return;
      }
      showNote(`Export ${result.count} รายการเป็น CSV แล้ว`);
    } catch (error) {
      showNote(error?.message || "Export ไม่สำเร็จ");
    }
  };

  const handleAddTransaction = () => {
    setActiveNav("transactions");
    setImportOpen(true);
    showNote("เพิ่มธุรกรรมจริงผ่านการนำเข้า statement ก่อน");
  };

  const refreshData = () => setRefreshCount((count) => count + 1);

  async function handleWipeData() {
    if (window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลทั้งหมด? การดำเนินการนี้ไม่สามารถเรียกคืนได้")) {
      try {
        await financeStore.wipeAllData();
        window.location.reload();
      } catch (error) {
        alert("เกิดข้อผิดพลาดในการลบข้อมูล: " + error.message);
      }
    }
  }

  const createAccount = async (event) => {
    event.preventDefault();

    try {
      await financeStore.createAccount({
        ...newAccountDraft,
        current_balance: bahtToSatang(newAccountDraft.current_balance),
      });
      setNewAccountDraft(EMPTY_ACCOUNT_DRAFT);
      refreshData();
      showNote("เพิ่มบัญชีแล้ว");
    } catch (error) {
      showNote(error?.message || "เพิ่มบัญชีไม่สำเร็จ");
    }
  };

  const saveAccount = async (id) => {
    try {
      const draft = accountDrafts[id];
      await financeStore.updateAccount(id, {
        ...draft,
        current_balance: bahtToSatang(draft.current_balance),
      });
      refreshData();
      showNote("บันทึกบัญชีแล้ว");
    } catch (error) {
      showNote(error?.message || "บันทึกบัญชีไม่สำเร็จ");
    }
  };

  const deleteAccount = async (id) => {
    try {
      const ok = window.confirm("ลบบัญชีนี้หรือไม่? บัญชีที่มีธุรกรรมแล้วจะลบไม่ได้");
      if (!ok) return;

      await financeStore.deleteAccount(id);
      if (account === id) setAccount("all");
      refreshData();
      showNote("ลบบัญชีแล้ว");
    } catch (error) {
      showNote(error?.message || "ลบบัญชีไม่สำเร็จ");
    }
  };

  const createBudget = async (event) => {
    event.preventDefault();

    try {
      await financeStore.createBudget({
        ...newBudgetDraft,
        monthly_limit: bahtToSatang(newBudgetDraft.monthly_limit),
      });
      setNewBudgetDraft(EMPTY_BUDGET_DRAFT);
      refreshData();
      showNote("เพิ่มงบประมาณแล้ว");
    } catch (error) {
      showNote(error?.message || "เพิ่มงบประมาณไม่สำเร็จ");
    }
  };

  const saveBudget = async (id) => {
    try {
      const draft = budgetDrafts[id];
      await financeStore.updateBudget(id, {
        ...draft,
        monthly_limit: bahtToSatang(draft.monthly_limit),
      });
      refreshData();
      showNote("บันทึกงบประมาณแล้ว");
    } catch (error) {
      showNote(error?.message || "บันทึกงบประมาณไม่สำเร็จ");
    }
  };

  const deleteBudget = async (id) => {
    try {
      await financeStore.deleteBudget(id);
      refreshData();
      showNote("ลบงบประมาณแล้ว");
    } catch (error) {
      showNote(error?.message || "ลบงบประมาณไม่สำเร็จ");
    }
  };

  const createGoal = async (event) => {
    event.preventDefault();

    try {
      await financeStore.createGoal({
        ...newGoalDraft,
        target_amount: bahtToSatang(newGoalDraft.target_amount),
        saved_amount: bahtToSatang(newGoalDraft.saved_amount),
      });
      setNewGoalDraft(EMPTY_GOAL_DRAFT);
      refreshData();
      showNote("เพิ่มเป้าหมายแล้ว");
    } catch (error) {
      showNote(error?.message || "เพิ่มเป้าหมายไม่สำเร็จ");
    }
  };

  const saveGoal = async (id) => {
    try {
      const draft = goalDrafts[id];
      await financeStore.updateGoal(id, {
        ...draft,
        target_amount: bahtToSatang(draft.target_amount),
        saved_amount: bahtToSatang(draft.saved_amount),
      });
      refreshData();
      showNote("บันทึกเป้าหมายแล้ว");
    } catch (error) {
      showNote(error?.message || "บันทึกเป้าหมายไม่สำเร็จ");
    }
  };

  const deleteGoal = async (id) => {
    try {
      await financeStore.deleteGoal(id);
      refreshData();
      showNote("ลบเป้าหมายแล้ว");
    } catch (error) {
      showNote(error?.message || "ลบเป้าหมายไม่สำเร็จ");
    }
  };

  const filterControls = (
    <FilterBar
      account={account}
      accounts={accountFilterOptions}
      range={range}
      refreshCount={refreshCount}
      source={source}
      onAccountChange={setAccount}
      onRangeChange={setRange}
      onRefresh={handleRefresh}
      onSourceChange={setSource}
    />
  );

  const importPanel = <ImportPanel visible={importOpen} onImported={handleImportComplete} />;

  const renderAccountForm = (draft, onChange, submitLabel, disabled = false) => (
    <div className="editor-grid">
      <label className="field-stack">
        <span>ชื่อบัญชี</span>
        <input
          value={draft.name}
          onChange={(event) => onChange("name", event.target.value)}
          placeholder="เช่น เงินเดือน, ใช้จ่ายประจำ"
          disabled={disabled}
        />
      </label>
      <label className="field-stack">
        <span>ธนาคาร/สถาบัน</span>
        <input
          list="thai-banks"
          value={draft.institution}
          onChange={(event) => onChange("institution", event.target.value)}
          placeholder="ค้นหาหรือพิมพ์ชื่อสถาบัน..."
          disabled={disabled}
          autoComplete="off"
        />
        <datalist id="thai-banks">
          <option value="KBank (กสิกรไทย)" />
          <option value="SCB (ไทยพาณิชย์)" />
          <option value="BBL (กรุงเทพ)" />
          <option value="KTB (กรุงไทย)" />
          <option value="Krungsri (กรุงศรีอยุธยา)" />
          <option value="TTB (ทหารไทยธนชาต)" />
          <option value="UOB (ยูโอบี)" />
          <option value="CIMB (ซีไอเอ็มบี ไทย)" />
          <option value="GSB (ออมสิน)" />
          <option value="GHB (ธอส.)" />
          <option value="BAAC (ธ.ก.ส.)" />
          <option value="TISCO (ทิสโก้)" />
          <option value="KKP (เกียรตินาคินภัทร)" />
          <option value="LHBANK (แลนด์ แอนด์ เฮ้าส์)" />
          <option value="ICBC (ไอซีบีซี ไทย)" />
          <option value="Standard Chartered" />
          <option value="Citibank" />
          <option value="TrueMoney Wallet" />
          <option value="ShopeePay" />
          <option value="Rabbit LINE Pay" />
          <option value="Kept by krungsri" />
          <option value="Make by KBank" />
          <option value="Dime!" />
          <option value="เงินสด (Cash)" />
        </datalist>
      </label>
      <label className="field-stack">
        <span>ประเภท</span>
        <select
          value={draft.type}
          onChange={(event) => onChange("type", event.target.value)}
          disabled={disabled}
        >
          {ACCOUNT_TYPE_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field-stack">
        <span>ยอดคงเหลือ (บาท)</span>
        <input
          type="number"
          step="0.01"
          value={draft.current_balance}
          onChange={(event) => onChange("current_balance", event.target.value)}
          disabled={disabled}
        />
      </label>
      <button className="add-button" type="submit" disabled={disabled}>
        {submitLabel}
      </button>
    </div>
  );

  const renderBudgetForm = (draft, onChange, submitLabel, disabled = false) => (
    <div className="editor-grid budget-editor-grid">
      <label className="field-stack">
        <span>หมวดหมู่</span>
        <select
          value={draft.category_id}
          onChange={(event) => onChange("category_id", event.target.value)}
          disabled={disabled}
        >
          {(realCategories.length > 0 ? realCategories.filter((c) => c.id !== "cat-income") : [
            { id: "cat-food", label: "อาหารและเครื่องดื่ม" },
            { id: "cat-housing", label: "ที่อยู่อาศัย" },
            { id: "cat-transport", label: "การเดินทาง" },
            { id: "cat-utility", label: "สาธารณูปโภค" },
            { id: "cat-shopping", label: "ช้อปปิ้ง" },
            { id: "cat-health", label: "สุขภาพ" },
            { id: "cat-entertainment", label: "ความบันเทิง" },
            { id: "cat-other", label: "อื่น ๆ" },
          ]).map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field-stack">
        <span>งบต่อเดือน (บาท)</span>
        <input
          type="number"
          step="0.01"
          value={draft.monthly_limit}
          onChange={(event) => onChange("monthly_limit", event.target.value)}
          disabled={disabled}
        />
      </label>
      <button className="add-button" type="submit" disabled={disabled}>
        {submitLabel}
      </button>
    </div>
  );

  const renderGoalForm = (draft, onChange, submitLabel, disabled = false) => (
    <div className="editor-grid goal-editor-grid">
      <label className="field-stack">
        <span>ชื่อเป้าหมาย</span>
        <input
          value={draft.label}
          onChange={(event) => onChange("label", event.target.value)}
          placeholder="เช่น เงินสำรองฉุกเฉิน"
          disabled={disabled}
        />
      </label>
      <label className="field-stack">
        <span>เป้าหมาย (บาท)</span>
        <input
          type="number"
          step="0.01"
          value={draft.target_amount}
          onChange={(event) => onChange("target_amount", event.target.value)}
          disabled={disabled}
        />
      </label>
      <label className="field-stack">
        <span>ออมแล้ว (บาท)</span>
        <input
          type="number"
          step="0.01"
          value={draft.saved_amount}
          onChange={(event) => onChange("saved_amount", event.target.value)}
          disabled={disabled}
        />
      </label>
      <button className="add-button" type="submit" disabled={disabled}>
        {submitLabel}
      </button>
    </div>
  );

  const renderActiveView = () => {
    switch (activeNav) {
      case "accounts":
        return (
          <>
            <AccountStrip accountId={account} accounts={realAccounts} />
            <section className="panel account-detail-panel">
              <div className="panel-header">
                <div>
                  <h2>บัญชีและกระเป๋า</h2>
                  <p>เพิ่ม แก้ไข หรือลบบัญชีที่บันทึกใน local browser storage</p>
                </div>
              </div>
              <form className="editor-form" onSubmit={createAccount}>
                <h3>เพิ่มบัญชีใหม่</h3>
                {renderAccountForm(
                  newAccountDraft,
                  (field, value) => setNewAccountDraft((draft) => ({ ...draft, [field]: value })),
                  "เพิ่มบัญชี",
                )}
              </form>

              <div className="account-editor-list">
                {realAccounts.length === 0 ? (
                  <div className="panel-empty">ยังไม่มีบัญชี เพิ่มบัญชีแรกเพื่อเริ่มนำเข้า statement</div>
                ) : (
                  realAccounts.map((item) => {
                    const draft = accountDrafts[item.id] || accountToDraft(item);

                    return (
                      <form
                        className="account-editor-card"
                        key={item.id}
                        onSubmit={(event) => {
                          event.preventDefault();
                          saveAccount(item.id);
                        }}
                      >
                        <div className="account-card-heading">
                          <div>
                            <span>{ACCOUNT_TYPE_LABELS[item.type] || "บัญชี"}</span>
                            <strong>{item.name}</strong>
                          </div>
                          <b>{formatMoney((item.current_balance || 0) / 100)}</b>
                        </div>
                        {renderAccountForm(
                          draft,
                          (field, value) =>
                            setAccountDrafts((drafts) => ({
                              ...drafts,
                              [item.id]: { ...draft, [field]: value },
                            })),
                          "บันทึกบัญชี",
                        )}
                        <div className="editor-actions">
                          <small>{item.institution || "ยังไม่ได้ระบุธนาคาร/สถาบัน"}</small>
                          <button
                            className="danger-button"
                            type="button"
                            onClick={() => deleteAccount(item.id)}
                          >
                            ลบบัญชี
                          </button>
                        </div>
                      </form>
                    );
                  })
                )}
              </div>
            </section>
          </>
        );

      case "transactions":
        return (
          <>
            {filterControls}
            {importPanel}
            <section className="panel">
              <div className="panel-header compact">
                <div>
                  <h2>จัดการหมวดหมู่และกฎ</h2>
                  <p>เพิ่ม/แก้ไข/ลบหมวดหมู่และกฎจับคู่ข้อความ (มีผลกับการนำเข้าถัดไปและสามารถปรับย้อนหลัง)</p>
                </div>
              </div>
              <CategoryManager
                categories={realCategories}
                rules={realRules}
                onChanged={() => setRefreshCount((c) => c + 1)}
              />
            </section>
            <TransactionTable
              category={category}
              rows={filteredTransactions}
              search={search}
              onAddTransaction={handleAddTransaction}
              onCategoryChange={setCategory}
              onSearchChange={setSearch}
              categories={realCategories}
              filterCategories={transactionCategoryOptions}
              onTransactionCategoryChange={async (txId, newCatId) => {
                try {
                  await financeStore.updateTransactionCategory(txId, newCatId);
                  setRefreshCount((c) => c + 1);
                } catch (e) {
                  alert(e?.message || "เปลี่ยนหมวดไม่สำเร็จ");
                }
              }}
            />
          </>
        );

      case "budgets":
        return (
          <>
            {filterControls}
            <div className="view-grid two-columns">
              <section className="panel budget-editor-panel">
                <div className="panel-header">
                  <div>
                    <h2>ตั้งงบประมาณ</h2>
                    <p>เพิ่ม แก้ไข หรือลบงบต่อหมวดจาก local browser storage</p>
                  </div>
                </div>
                <form className="editor-form" onSubmit={createBudget}>
                  <h3>เพิ่มงบใหม่</h3>
                  {renderBudgetForm(
                    newBudgetDraft,
                    (field, value) => setNewBudgetDraft((draft) => ({ ...draft, [field]: value })),
                    "เพิ่มงบ",
                  )}
                </form>
                <div className="account-editor-list">
                  {realBudgets.length === 0 ? (
                    <div className="panel-empty">ยังไม่มีงบประมาณ เพิ่มหมวดแรกเพื่อเริ่มติดตาม</div>
                  ) : (
                    realBudgets.map((item) => {
                      const draft = budgetDrafts[item.id] || budgetToDraft(item);

                      return (
                        <form
                          className="account-editor-card"
                          key={item.id}
                          onSubmit={(event) => {
                            event.preventDefault();
                            saveBudget(item.id);
                          }}
                        >
                          <div className="account-card-heading">
                            <div>
                              <span>งบต่อเดือน</span>
                              <strong>{item.category_label}</strong>
                            </div>
                            <b>{formatMoney((item.monthly_limit || 0) / 100)}</b>
                          </div>
                          {renderBudgetForm(
                            draft,
                            (field, value) =>
                              setBudgetDrafts((drafts) => ({
                                ...drafts,
                                [item.id]: { ...draft, [field]: value },
                              })),
                            "บันทึกงบ",
                          )}
                          <div className="editor-actions">
                            <small>หมวด {item.category_label}</small>
                            <button
                              className="danger-button"
                              type="button"
                              onClick={() => deleteBudget(item.id)}
                            >
                              ลบงบ
                            </button>
                          </div>
                        </form>
                      );
                    })
                  )}
                </div>
              </section>
              <BudgetPanel budgets={realBudgets} transactions={analyticTransactions} />
              <ExpenseDonut transactions={analyticTransactions} />
            </div>
          </>
        );

      case "goals":
        return (
          <section className="panel goal-panel">
            <div className="panel-header">
              <div>
                <h2>เป้าหมายออม</h2>
                <p>เพิ่ม แก้ไข หรือลบเป้าหมายที่บันทึกใน local browser storage</p>
              </div>
            </div>
            <form className="editor-form" onSubmit={createGoal}>
              <h3>เพิ่มเป้าหมายใหม่</h3>
              {renderGoalForm(
                newGoalDraft,
                (field, value) => setNewGoalDraft((draft) => ({ ...draft, [field]: value })),
                "เพิ่มเป้าหมาย",
              )}
            </form>
            <div className="goal-list">
              {realGoals.length === 0 ? (
                <div className="panel-empty">ยังไม่มีเป้าหมาย เพิ่มเป้าหมายแรกเพื่อเริ่มติดตาม</div>
              ) : (
                realGoals.map((item) => {
                  const draft = goalDrafts[item.id] || goalToDraft(item);
                  const percent =
                    item.target_amount > 0
                      ? Math.min(100, Math.round((item.saved_amount / item.target_amount) * 100))
                      : 0;

                  return (
                    <form
                      className="goal-editor-card"
                      key={item.id}
                      onSubmit={(event) => {
                        event.preventDefault();
                        saveGoal(item.id);
                      }}
                    >
                      <div className="goal-progress-row">
                        <div>
                          <strong>{item.label}</strong>
                          <span>
                            {formatMoney((item.saved_amount || 0) / 100)} /{" "}
                            {formatMoney((item.target_amount || 0) / 100)}
                          </span>
                        </div>
                        <div className="budget-meter" aria-label={`${item.label} สำเร็จ ${percent}%`}>
                          <span style={{ width: `${percent}%` }} />
                        </div>
                        <b>{percent}%</b>
                      </div>
                      {renderGoalForm(
                        draft,
                        (field, value) =>
                          setGoalDrafts((drafts) => ({
                            ...drafts,
                            [item.id]: { ...draft, [field]: value },
                          })),
                        "บันทึกเป้าหมาย",
                      )}
                      <div className="editor-actions">
                        <small>บันทึกเมื่อ {new Date(item.updated_at).toLocaleDateString("th-TH")}</small>
                        <button
                          className="danger-button"
                          type="button"
                          onClick={() => deleteGoal(item.id)}
                        >
                          ลบเป้าหมาย
                        </button>
                      </div>
                    </form>
                  );
                })
              )}
            </div>
          </section>
        );

      case "reports":
        return (
          <>
            {filterControls}
            <div className="view-grid reports-grid">
              <CashflowChart defaultPeriod="monthly" rangeFactor={activeRange.factor} transactions={analyticTransactions} />
              <ExpenseDonut transactions={analyticTransactions} />
              <ProfitabilityPanel
                accountCount={realAccounts.length}
                metrics={metrics}
                transactions={analyticTransactions}
              />
            </div>
            <ReportsAnalytics transactions={analyticTransactions} accounts={realAccounts} />
          </>
        );

      case "insights":
        return (
          <div className="view-grid two-columns">
            <InsightPanel transactions={analyticTransactions} />
            <ProfitabilityPanel
              accountCount={realAccounts.length}
              metrics={metrics}
              transactions={analyticTransactions}
            />
          </div>
        );

      case "settings":
        return (
          <section className="panel settings-panel">
            <div className="panel-header">
              <div>
                <h2>ตั้งค่าและจัดการข้อมูล</h2>
                <p>สถานะระบบและการลบข้อมูล</p>
              </div>
            </div>
            <div className="settings-list">
              <article>
                <span>โหมดการทำงาน</span>
                <strong>Web app (local browser)</strong>
              </article>
              <article>
                <span>ที่เก็บข้อมูล</span>
                <strong>IndexedDB / local browser storage</strong>
              </article>
              <article>
                <span>จำนวนรายการจริง</span>
                <strong>{normalizedTransactions.length.toLocaleString("th-TH")} รายการ</strong>
              </article>
            </div>
            <div className="editor-form" style={{ borderTop: "1px solid var(--line)", marginTop: "20px" }}>
              <h3>จัดการข้อมูล</h3>
              <p style={{ color: "var(--text-soft)", fontSize: "var(--text-sm)", marginBottom: "14px" }}>
                ลบข้อมูลทั้งหมดที่บันทึกไว้ในเบราว์เซอร์นี้
              </p>
              <button 
                className="danger-button" 
                type="button" 
                onClick={handleWipeData}
                style={{ padding: "8px 16px", fontWeight: "700" }}
              >
                ลบข้อมูลทั้งหมด
              </button>
            </div>
          </section>
        );

      case "overview":
      default:
        return (
          <>
            {filterControls}
            {importPanel}
            <AccountStrip accountId={account} accounts={realAccounts} />
            <MetricGrid metrics={metrics} isLoading={isGlobalLoading} />
            <div className="analytics-layout">
              <CashflowChart rangeFactor={activeRange.factor} transactions={analyticTransactions} />
              <ExpenseDonut transactions={analyticTransactions} />
              <BudgetPanel budgets={realBudgets} transactions={analyticTransactions} />
            </div>
          </>
        );
    }
  };

  return (
    <div className="app-shell">
      <Sidebar activeNav={activeNav} onChange={setActiveNav} />
      <main className="app-main">
        <Topbar
          activeNavLabel={activeNavLabel}
          exportNote={exportNote}
          importOpen={importOpen}
          onExport={handleExport}
          onImport={handleImportToggle}
        />
        <div className="dashboard-content">{renderActiveView()}</div>
      </main>
    </div>
  );
}
