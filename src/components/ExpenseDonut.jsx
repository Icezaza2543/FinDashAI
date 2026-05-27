import { PieChart } from "lucide-react";
import { formatMoney } from "../utils/formatters";

export default function ExpenseDonut({ transactions = [] }) {
  const hasRealData = transactions.length > 0;

  let categories = [];
  let totalExpense = 0;

  if (hasRealData) {
    // รวมรายจ่ายตาม categoryLabel
    const expenseByCategory = {};

    transactions.forEach(tx => {
      if (tx.expense > 0) {
        const label = tx.categoryLabel || "อื่น ๆ";
        if (!expenseByCategory[label]) {
          expenseByCategory[label] = 0;
        }
        expenseByCategory[label] += tx.expense;
      }
    });

    totalExpense = Object.values(expenseByCategory).reduce((a, b) => a + b, 0);

    if (totalExpense > 0) {
      categories = Object.entries(expenseByCategory)
        .map(([label, amount], index) => {
          const value = Math.round((amount / totalExpense) * 1000) / 10; // 1 decimal
          const colors = ["#1d77d2", "#7c4dba", "#0e9f6e", "#f5a623", "#ef4444", "#0891b2", "#94a3b8"];
          return {
            label,
            amount,
            value,
            color: colors[index % colors.length]
          };
        })
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 7); // แสดงสูงสุด 7 หมวด
    }
  }

  const hasExpenseData = categories.length > 0;

  // สร้าง gradient สำหรับ donut
  let stop = 0;
  const gradient = categories
    .map((item) => {
      const start = stop;
      stop += item.value;
      return `${item.color} ${start}% ${stop}%`;
    })
    .join(", ");

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
