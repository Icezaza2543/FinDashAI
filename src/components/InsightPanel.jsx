import { AlertTriangle, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { formatMoney } from "../utils/formatters";

function buildInsights(transactions) {
  if (transactions.length === 0) {
    return [];
  }

  const totals = transactions.reduce(
    (summary, transaction) => ({
      income: summary.income + (transaction.income || 0),
      expense: summary.expense + (transaction.expense || 0),
    }),
    { income: 0, expense: 0 },
  );

  const expenseByCategory = new Map();
  transactions.forEach((transaction) => {
    if (!transaction.expense) return;

    const label = transaction.categoryLabel || "อื่น ๆ";
    expenseByCategory.set(label, (expenseByCategory.get(label) || 0) + transaction.expense);
  });

  const insightRows = [];
  const topExpense = Array.from(expenseByCategory.entries()).sort((a, b) => b[1] - a[1])[0];

  if (topExpense) {
    insightRows.push({
      id: "top-expense",
      tone: "warning",
      icon: AlertTriangle,
      title: `รายจ่ายสูงสุดคือ ${topExpense[0]}`,
      text: `ใช้ไป ${formatMoney(topExpense[1] / 100)} จากข้อมูลที่ตรงกับตัวกรอง`,
    });
  }

  if (totals.income > 0 && totals.income >= totals.expense) {
    insightRows.push({
      id: "positive-net",
      tone: "positive",
      icon: TrendingUp,
      title: "เงินสุทธิเป็นบวก",
      text: `เหลือสุทธิ ${formatMoney((totals.income - totals.expense) / 100)} ในช่วงข้อมูลนี้`,
    });
  }

  if (totals.expense > totals.income) {
    insightRows.push({
      id: "negative-net",
      tone: "warning",
      icon: TrendingDown,
      title: "รายจ่ายมากกว่ารายรับ",
      text: `ติดลบ ${formatMoney((totals.expense - totals.income) / 100)} จากรายการที่นำเข้า`,
    });
  }

  if (totals.income === 0) {
    insightRows.push({
      id: "missing-income",
      tone: "warning",
      icon: AlertTriangle,
      title: "ยังไม่พบรายการรายรับ",
      text: "นำเข้า statement ของบัญชีรับเงินเดือนหรือบัญชีรายรับ เพื่อให้ภาพรวมแม่นขึ้น",
    });
  }

  return insightRows.slice(0, 4);
}

export default function InsightPanel({ transactions = [] }) {
  const insightRows = buildInsights(transactions);

  return (
    <section className="panel insights-panel">
      <div className="panel-header compact">
        <div>
          <h2>AI Insights</h2>
          <p>วิเคราะห์จากธุรกรรมจริงที่ตรงกับตัวกรอง</p>
        </div>
        <Sparkles size={19} />
      </div>
      <div className="insight-list">
        {insightRows.length === 0 ? (
          <div className="panel-empty">ยังไม่มีข้อมูลจริงเพียงพอสำหรับสร้าง insight</div>
        ) : (
          insightRows.map((item) => {
            const Icon = item.icon;

            return (
              <article className={`insight-card ${item.tone}`} key={item.id}>
                <Icon size={22} />
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.text}</span>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
