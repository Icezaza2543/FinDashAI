import { useMemo } from "react";
import { formatMoney } from "../utils/formatters";

export default function ReportsAnalytics({ transactions = [], accounts = [] }) {
  const hasData = transactions.length > 0;

  // 1. Monthly trend (last 12 months)
  const monthlyTrend = useMemo(() => {
    const byMonth = {};
    transactions.forEach((tx) => {
      if (!tx.date) return;
      const ym = String(tx.date).slice(0, 7);
      if (!byMonth[ym]) byMonth[ym] = { income: 0, expense: 0 };
      byMonth[ym].income += tx.income || 0;
      byMonth[ym].expense += tx.expense || 0;
    });
    return Object.keys(byMonth)
      .sort()
      .slice(-12)
      .map((ym) => ({
        ym,
        label: ym,
        income: Math.round(byMonth[ym].income / 100),
        expense: Math.round(byMonth[ym].expense / 100),
      }));
  }, [transactions]);

  // 2. Category breakdown (expenses)
  const catBreakdown = useMemo(() => {
    const map = {};
    transactions.forEach((tx) => {
      if ((tx.expense || 0) > 0) {
        const l = tx.categoryLabel || "อื่น ๆ";
        map[l] = (map[l] || 0) + (tx.expense || 0);
      }
    });
    return Object.entries(map)
      .map(([label, sat]) => ({ label, amount: Math.round(sat / 100) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [transactions]);

  // 3. Largest expenses
  const largestExpenses = useMemo(() => {
    return [...transactions]
      .filter((t) => (t.expense || 0) > 0)
      .sort((a, b) => (b.expense || 0) - (a.expense || 0))
      .slice(0, 6)
      .map((t) => ({
        date: t.date,
        title: t.title,
        category: t.categoryLabel,
        amount: (t.expense || 0) / 100,
      }));
  }, [transactions]);

  // 4. Account flow
  const accountFlow = useMemo(() => {
    const map = new Map(accounts.map((a) => [a.id, { name: a.name, income: 0, expense: 0 }]));
    transactions.forEach((tx) => {
      const acc = map.get(tx.account) || map.get(tx.account_id);
      if (acc) {
        acc.income += tx.income || 0;
        acc.expense += tx.expense || 0;
      }
    });
    return Array.from(map.values()).filter((a) => a.income || a.expense);
  }, [transactions, accounts]);

  // 5. Simple pattern insights
  const patternInsights = useMemo(() => {
    const merchantCount = {};
    transactions.forEach((tx) => {
      const key = (tx.title || "").toLowerCase().slice(0, 18);
      if (key) merchantCount[key] = (merchantCount[key] || 0) + 1;
    });
    const recurring = Object.entries(merchantCount)
      .filter(([, c]) => c >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([m, c]) => ({ merchant: m, count: c }));
    const totalNet = transactions.reduce((s, t) => s + (t.income || 0) - (t.expense || 0), 0) / 100;
    return { recurring, totalNet: Math.round(totalNet) };
  }, [transactions]);

  const maxTrend = Math.max(
    1,
    ...monthlyTrend.flatMap((m) => [m.income, m.expense])
  );

  return (
    <div className="reports-analytics">
      {/* Monthly Trend - native SVG */}
      <section className="panel analytics-panel">
        <div className="panel-header compact">
          <div>
            <h2>แนวโน้มรายเดือน</h2>
            <p>รายรับ vs รายจ่าย 12 เดือนล่าสุด</p>
          </div>
        </div>
        {!hasData || monthlyTrend.length === 0 ? (
          <div className="panel-empty">ยังไม่มีข้อมูลเพียงพอ</div>
        ) : (
          <div className="trend-svg-wrap">
            <svg viewBox="0 0 720 180" className="trend-svg" role="img" aria-label="กราฟแนวโน้ม">
              {/* grid */}
              {[0, 1, 2, 3].map((i) => (
                <line key={i} x1="40" y1={30 + i * 38} x2="700" y2={30 + i * 38} stroke="#e5eef6" strokeWidth="1" />
              ))}
              {/* bars + lines */}
              {monthlyTrend.map((m, idx) => {
                const x = 60 + idx * 52;
                const hI = Math.round((m.income / maxTrend) * 120);
                const hE = Math.round((m.expense / maxTrend) * 120);
                return (
                  <g key={m.ym}>
                    <rect x={x - 14} y={160 - hI} width="18" height={hI} fill="#0e9f6e" opacity="0.9" rx="2" />
                    <rect x={x + 6} y={160 - hE} width="18" height={hE} fill="#d92d35" opacity="0.85" rx="2" />
                    <text x={x} y="175" fontSize="9" fill="#526477" textAnchor="middle">{m.label.slice(5)}</text>
                  </g>
                );
              })}
              {/* simple net line */}
              {monthlyTrend.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#1d77d2"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={monthlyTrend
                    .map((m, idx) => {
                      const x = 60 + idx * 52 + 5;
                      const net = Math.max(0, Math.min(120, Math.round(((m.income - m.expense) / maxTrend) * 120)));
                      return `${x},${160 - net}`;
                    })
                    .join(" ")}
                />
              )}
            </svg>
            <div className="trend-legend">
              <span className="l-income" /> รายรับ &nbsp; <span className="l-expense" /> รายจ่าย &nbsp; <span className="l-net" /> เงินสุทธิ
            </div>
          </div>
        )}
      </section>

      {/* Category bars + largest expenses side by side dense */}
      <div className="reports-split">
        <section className="panel analytics-panel">
          <div className="panel-header compact">
            <div>
              <h2>สัดส่วนรายจ่ายตามหมวด</h2>
              <p>Top categories</p>
            </div>
          </div>
          {!hasData || catBreakdown.length === 0 ? (
            <div className="panel-empty">ไม่มีรายจ่าย</div>
          ) : (
            <div className="cat-bars">
              {catBreakdown.map((c, i) => {
                const maxA = catBreakdown[0].amount || 1;
                const pct = Math.round((c.amount / maxA) * 100);
                return (
                  <div className="cat-bar-row" key={i}>
                    <span className="cat-name">{c.label}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <b className="cat-amt">{formatMoney(c.amount)}</b>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel analytics-panel">
          <div className="panel-header compact">
            <div>
              <h2>รายจ่ายสูงสุด</h2>
              <p>Top 6 รายการ</p>
            </div>
          </div>
          <div className="top-expense-table">
            {largestExpenses.length === 0 ? (
              <div className="panel-empty">ไม่มีข้อมูล</div>
            ) : (
              <table>
                <thead><tr><th>วันที่</th><th>รายการ</th><th>หมวด</th><th className="right">จำนวน</th></tr></thead>
                <tbody>
                  {largestExpenses.map((e, idx) => (
                    <tr key={idx}>
                      <td>{e.date ? String(e.date).slice(5) : "-"}</td>
                      <td className="ell">{e.title}</td>
                      <td>{e.category}</td>
                      <td className="right money-out">{formatMoney(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {/* Account flow + Pattern insights */}
      <div className="reports-split">
        <section className="panel analytics-panel">
          <div className="panel-header compact">
            <div>
              <h2>กระแสเงินต่อบัญชี</h2>
            </div>
          </div>
          {accountFlow.length === 0 ? (
            <div className="panel-empty">ยังไม่มีบัญชีหรือธุรกรรม</div>
          ) : (
            <div className="account-flow-list">
              {accountFlow.map((a, i) => {
                const net = Math.round((a.income - a.expense) / 100);
                return (
                  <div key={i} className="flow-row">
                    <span>{a.name}</span>
                    <span className="flow-income">+{formatMoney(a.income / 100)}</span>
                    <span className="flow-expense">-{formatMoney(a.expense / 100)}</span>
                    <b className={net >= 0 ? "net-pos" : "net-neg"}>{net >= 0 ? "+" : ""}{formatMoney(net)}</b>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel analytics-panel">
          <div className="panel-header compact">
            <div>
              <h2>ข้อมูลเชิงลึก (Recurring &amp; Patterns)</h2>
            </div>
          </div>
          <div className="insights-dense">
            <div>
              <strong>เงินสุทธิรวม (ตามตัวกรอง)</strong>
              <div className={patternInsights.totalNet >= 0 ? "big-pos" : "big-neg"}>
                {formatMoney(patternInsights.totalNet)}
              </div>
            </div>
            <div>
              <strong>ร้านค้าที่พบซ้ำ (≥3 ครั้ง)</strong>
              {patternInsights.recurring.length === 0 ? (
                <div className="muted">ยังไม่มีรูปแบบซ้ำชัดเจน</div>
              ) : (
                <ul className="recurring-list">
                  {patternInsights.recurring.map((r, i) => (
                    <li key={i}>{r.merchant} <span className="cnt">{r.count}×</span></li>
                  ))}
                </ul>
              )}
            </div>
            <small className="muted">Insights คำนวณจากข้อมูลในเครื่องแบบเรียลไทม์ ไม่มี AI ภายนอก</small>
          </div>
        </section>
      </div>
    </div>
  );
}
