import { useState } from "react";

const PERIOD_OPTIONS = [
  { id: "daily", label: "รายวัน", maxBars: 48 },
  { id: "monthly", label: "รายเดือน", maxBars: 24 },
  { id: "yearly", label: "รายปี", maxBars: 8 },
];

function formatMonthLabel(ym) {
  // ym: YYYY-MM
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("th-TH", { month: "short", year: "numeric" });
}

function formatYearLabel(y) {
  return String(y);
}

export default function CashflowChart({ rangeFactor = 1, transactions = [], defaultPeriod = "monthly" }) {
  const [period, setPeriod] = useState(defaultPeriod);
  const hasRealData = transactions.length > 0;
  const currentOpt = PERIOD_OPTIONS.find((p) => p.id === period) || PERIOD_OPTIONS[1];

  let chartData = [];
  let viewLabel = currentOpt.label;

  if (hasRealData) {
    const groups = {};

    transactions.forEach((tx) => {
      let key = "1970-01-01";
      if (tx.date) {
        const d = String(tx.date).slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
          if (period === "daily") {
            key = d;
          } else if (period === "monthly") {
            key = d.slice(0, 7); // YYYY-MM
          } else {
            key = d.slice(0, 4); // YYYY
          }
        } else {
          key = d || key;
        }
      }
      if (!groups[key]) {
        groups[key] = { income: 0, expense: 0, rawDate: key };
      }
      groups[key].income += (tx.income || 0) / 100;
      groups[key].expense += (tx.expense || 0) / 100;
    });

    // Sort keys chrono asc, take latest N
    let sortedKeys = Object.keys(groups).sort((a, b) => a.localeCompare(b));
    sortedKeys = sortedKeys.slice(-currentOpt.maxBars);

    chartData = sortedKeys.map((key) => {
      const inc = Math.round(groups[key].income);
      const exp = Math.round(groups[key].expense);
      const net = inc - exp;
      const maxVal = Math.max(inc, exp, Math.abs(net), 1);
      const scale = 94 / maxVal;
      let label = key;
      if (period === "monthly") label = formatMonthLabel(key);
      else if (period === "yearly") label = formatYearLabel(key);
      else label = key.slice(5); // MM-DD
      return {
        key,
        label,
        income: Math.min(100, Math.max(4, Math.round(inc * scale))),
        expense: Math.min(100, Math.max(4, Math.round(exp * scale))),
        net: Math.round(net * scale * 0.82),
        incomeRaw: inc,
        expenseRaw: exp,
      };
    });
  }

  return (
    <section className="panel cashflow-panel">
      <div className="panel-header">
        <div>
          <h2>กระแสเงินสด</h2>
          <p>{hasRealData ? `มุมมอง${viewLabel} • จากข้อมูลที่นำเข้า` : "ยังไม่มีธุรกรรมจริงสำหรับสร้างกราฟ"}</p>
        </div>
        <div className="segmented" role="tablist" aria-label="เลือกช่วงเวลา">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={period === opt.id}
              className={`seg-btn ${period === opt.id ? "active" : ""}`}
              onClick={() => setPeriod(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-legend" aria-hidden="true">
        <span className="legend-dot income" /> รายรับ
        <span className="legend-dot expense" /> รายจ่าย
        <span className="legend-line" /> เงินสุทธิ
      </div>
      {chartData.length === 0 ? (
        <div className="panel-empty">นำเข้า statement หรือเพิ่มธุรกรรมจริงเพื่อดูกราฟกระแสเงินสด</div>
      ) : (
        <div className="cash-chart" aria-label={`กราฟกระแสเงินสด ${viewLabel}`}>
          {chartData.map((item, index) => {
            const netHeight = Math.max(10, Math.min(93, (item.net || 0) * 1.48 * Math.min(rangeFactor, 1.3)));

            return (
              <div className="cash-day" key={`${item.key}-${index}`}>
                <div className="net-point" style={{ bottom: `${netHeight}%` }} title={`สุทธิ ${item.incomeRaw - item.expenseRaw} บาท`} />
                <div className="cash-bars">
                  <span className="income-bar" style={{ height: `${item.income || 8}%` }} title={`รายรับ ${item.incomeRaw} บาท`} />
                  <span className="expense-bar" style={{ height: `${item.expense || 8}%` }} title={`รายจ่าย ${item.expenseRaw} บาท`} />
                </div>
                <em>{item.label}</em>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
