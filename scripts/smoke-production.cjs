const fs = require("fs");
const os = require("os");
const path = require("path");

const {
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
} = require("../electron/database");
const { parseStatementFile } = require("../electron/statementParser");

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "findash-smoke-"));
  const csvPath = path.join(tempDir, "statement.csv");

  fs.writeFileSync(
    csvPath,
    [
      "วันที่,รายการ,จำนวนเงิน",
      "31/05/2567,เงินเดือน,45000",
      "30/05/2567,บิ๊กซี,-1245",
      "29/05/2567,Grab Taxi,-120",
      "",
    ].join("\n"),
    "utf8",
  );

  initDatabase(tempDir);
  const profile = updateUserProfile({
    display_name: "Smoke User",
    avatar_initial: "SU",
    email: "smoke@local",
  });
  const importAccount = createAccount({
    name: "บัญชีทดสอบ",
    institution: "Smoke Bank",
    type: "bank",
    current_balance: 0,
  });
  const disposableAccount = createAccount({
    name: "บัญชีชั่วคราว",
    institution: "Smoke Cash",
    type: "cash",
    current_balance: 0,
  });
  const updatedDisposableAccount = updateAccount(disposableAccount.id, {
    name: "เงินสดสำรอง",
    institution: "Smoke Cash",
    type: "cash",
    current_balance: 12300,
  });
  const deletedDisposableAccount = deleteAccount(disposableAccount.id);
  const budget = createBudget({
    category_id: "cat-food",
    monthly_limit: 500000,
  });
  const updatedBudget = updateBudget(budget.id, {
    category_id: "cat-food",
    monthly_limit: 650000,
  });
  const goal = createGoal({
    label: "เงินสำรอง",
    target_amount: 1000000,
    saved_amount: 250000,
  });
  const updatedGoal = updateGoal(goal.id, {
    label: "เงินสำรองฉุกเฉิน",
    target_amount: 1200000,
    saved_amount: 300000,
  });
  const parsed = await parseStatementFile(csvPath);
  const preview = enrichForPreview(parsed.transactions);
  const firstImport = importTransactions({ parsed, accountId: importAccount.id });
  const secondImport = importTransactions({ parsed, accountId: importAccount.id });
  const accounts = getAccounts();
  const budgets = getBudgets();
  const goals = getGoals();
  const transactions = getTransactions();
  const savedProfile = getUserProfile();
  const deletedBudget = deleteBudget(budget.id);
  const deletedGoal = deleteGoal(goal.id);
  const budgetsAfterDelete = getBudgets();
  const goalsAfterDelete = getGoals();
  closeDatabase();

  const importedAccount = accounts.find((account) => account.id === importAccount.id);
  const disposableStillExists = accounts.some((account) => account.id === disposableAccount.id);
  const expectedCategories = ["cat-income", "cat-food", "cat-transport"];
  const actualCategories = preview.map((transaction) => transaction.category_id);

  const checks = [
    ["parsed CSV rows", parsed.count === 3],
    ["category rules", JSON.stringify(actualCategories) === JSON.stringify(expectedCategories)],
    ["first import inserts rows", firstImport.imported === 3 && firstImport.skipped === 0],
    ["second import dedupes rows", secondImport.imported === 0 && secondImport.skipped === 3],
    ["transactions readable", transactions.length === 3],
    ["account create persists institution", importedAccount?.institution === "Smoke Bank"],
    ["account balance updated", importedAccount?.current_balance === 4363500],
    ["account update works", updatedDisposableAccount.current_balance === 12300],
    ["account delete works", deletedDisposableAccount.deleted === true && !disposableStillExists],
    ["profile update works", profile.display_name === "Smoke User" && savedProfile.email === "smoke@local"],
    ["budget CRUD works", budgets[0]?.monthly_limit === 650000 && updatedBudget.category_id === "cat-food" && deletedBudget.deleted === true && budgetsAfterDelete.length === 0],
    ["goal CRUD works", goals[0]?.label === "เงินสำรองฉุกเฉิน" && updatedGoal.saved_amount === 300000 && deletedGoal.deleted === true && goalsAfterDelete.length === 0],
  ];

  const failed = checks.filter(([, passed]) => !passed);
  if (failed.length > 0) {
    console.error("Smoke failed:", failed.map(([name]) => name).join(", "));
    process.exit(1);
  }

  console.log(JSON.stringify({
    ok: true,
    parsed: parsed.count,
    imported: firstImport.imported,
    skippedOnDuplicate: secondImport.skipped,
    transactionCount: transactions.length,
    accountBalance: importedAccount.current_balance,
    budgetLimit: updatedBudget.monthly_limit,
    goalSaved: updatedGoal.saved_amount,
    profile: savedProfile.display_name,
  }, null, 2));
}

main().catch((error) => {
  closeDatabase();
  console.error(error);
  process.exit(1);
});
