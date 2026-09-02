import { useMemo } from "react";
import { PieChart } from "lucide-react";
import { formatMoney } from "../utils/formatters";

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#f43f5e", "#6366f1", "#94a3b8"];

export default function ExpenseDonut({ transactions = [] }) {
  const hasRealData = transactions.length > 0;
  const { categories, gradient, totalExpense } = useMemo(() => {
    const expenseByCategory = {};

    transactions.forEach((tx) => {
      if (tx.expense > 0) {
        const label = tx.categoryLabel || "อื่น ๆ";
        expenseByCategory[label] = (expenseByCategory[label] || 0) + tx.expense;
      }
    });

    const nextTotalExpense = Object.values(expenseByCategory).reduce(
      (sum, amount) => sum + amount,
      0
    );
    const nextCategories =
      nextTotalExpense > 0
        ? Object.entries(expenseByCategory)
            .map(([label, amount], index) => ({
              label,
              amount,
              value: Math.round((amount / nextTotalExpense) * 1000) / 10,
              color: CHART_COLORS[index % CHART_COLORS.length],
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 7)
        : [];

    let stop = 0;
    const nextGradient = nextCategories
      .map((item) => {
        const start = stop;
        stop += item.value;
        return `${item.color} ${start}% ${stop}%`;
      })
      .join(", ");

    return { categories: nextCategories, gradient: nextGradient, totalExpense: nextTotalExpense };
  }, [transactions]);

  const hasExpenseData = categories.length > 0;

  return (
    <section className="panel category-panel">
      <div className="panel-header compact">
        <div>
          <h2>หมวดรายจ่าย</h2>
          <p>{hasRealData ? "จากข้อมูลที่นำเข้า" : "ยังไม่มีข้อมูลรายจ่ายจริง"}</p>
        </div>
        <PieChart size={19} />
      </div>
      {hasExpenseData ? (
        <div className="donut-layout">
          <div className="donut-chart" style={{ background: `conic-gradient(${gradient})` }}>
            <span>
              <strong>{formatMoney(totalExpense / 100)}</strong>
              <small>รวม</small>
            </span>
          </div>
          <ul className="category-list">
            {categories.map((item) => (
              <li key={item.label}>
                <i style={{ background: item.color }} />
                <span>{item.label}</span>
                <b>{item.value}%</b>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="panel-empty">ยังไม่มีรายจ่ายจริงให้จัดกลุ่มหมวดหมู่</div>
      )}
    </section>
  );
}
