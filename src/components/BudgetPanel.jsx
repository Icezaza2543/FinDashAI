import { formatMoney } from "../utils/formatters";

export default function BudgetPanel({ budgets = [], transactions = [] }) {
  const spentByCategory = new Map();

  transactions.forEach((transaction) => {
    if (!transaction.expense) return;

    const categoryId = transaction.categoryId || `cat-${transaction.category || "other"}`;
    spentByCategory.set(categoryId, (spentByCategory.get(categoryId) || 0) + transaction.expense);
  });

  const budgetRows = budgets
    .map((budget) => {
      const spent = spentByCategory.get(budget.category_id) || 0;
      const limit = budget.monthly_limit || 0;
      const percent = limit > 0 ? Math.round((spent / limit) * 100) : 0;

      return {
        ...budget,
        spent,
        limit,
        percent,
      };
    })
    .sort((a, b) => b.percent - a.percent || b.spent - a.spent)
    .slice(0, 5);

  return (
    <section className="panel budget-panel">
      <div className="panel-header compact">
        <div>
          <h2>งบประมาณ</h2>
          <p>{budgetRows.length > 0 ? "ใช้จริงเทียบงบที่ตั้งไว้" : "ยังไม่มีงบประมาณที่บันทึกไว้"}</p>
        </div>
      </div>
      <div className="budget-list">
        {budgetRows.length === 0 ? (
          <div className="panel-empty">เพิ่มงบประมาณในเมนูนี้เพื่อเริ่มติดตามรายจ่ายรายหมวด</div>
        ) : (
          budgetRows.map((item) => {
            const tone = item.percent >= 100 ? "danger" : item.percent >= 80 ? "risk" : "good";

            return (
              <div className={`budget-row ${tone}`} key={item.id}>
                <div>
                  <strong>{item.category_label || "อื่น ๆ"}</strong>
                  <span>
                    {formatMoney(item.spent / 100)} / {formatMoney(item.limit / 100)}
                  </span>
                </div>
                <div className="budget-meter" aria-label={`${item.category_label} ใช้ไป ${item.percent}%`}>
                  <span style={{ width: `${Math.min(item.percent, 118)}%` }} />
                </div>
                <b>{item.percent}%</b>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
