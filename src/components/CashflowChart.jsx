import { ChevronDown } from "lucide-react";

export default function CashflowChart({ rangeFactor = 1, transactions = [] }) {
  const hasRealData = transactions.length > 0;
  let chartData = [];

  if (hasRealData) {
    // รวมรายรับ-รายจ่ายตามวัน (ใช้วันของเดือน)
    const daily = {};

    transactions.forEach(tx => {
      // ดึงวันจากวันที่ (รองรับทั้ง ISO และรูปแบบเก่า)
      let day = "01";
      if (tx.date) {
        const parts = tx.date.split(/[-/]/);
        day = parts[2] ? parts[2].padStart(2, "0") : parts[0].padStart(2, "0");
      }

      if (!daily[day]) {
        daily[day] = { income: 0, expense: 0 };
      }
      daily[day].income += (tx.income || 0) / 100;   // แปลงจากสตางค์เป็นบาท
      daily[day].expense += (tx.expense || 0) / 100;
    });

    // สร้างข้อมูลสำหรับกราฟ (เรียงวัน)
    const sortedDays = Object.keys(daily).sort((a, b) => parseInt(a) - parseInt(b));

    chartData = sortedDays.map(day => {
      const inc = Math.round(daily[day].income);
      const exp = Math.round(daily[day].expense);
      const net = inc - exp;

      // ปรับสเกลให้กราฟสวย (max 100)
      const maxVal = Math.max(inc, exp, Math.abs(net), 1);
      const scale = 95 / maxVal;

      return {
        day,
        income: Math.min(100, Math.max(4, Math.round(inc * scale))),
        expense: Math.min(100, Math.max(4, Math.round(exp * scale))),
        net: Math.round(net * scale * 0.8),
      };
    });

  }

  return (
    <section className="panel cashflow-panel">
      <div className="panel-header">
        <div>
          <h2>กระแสเงินสด</h2>
          <p>{hasRealData ? "จากข้อมูลที่นำเข้า" : "ยังไม่มีธุรกรรมจริงสำหรับสร้างกราฟ"}</p>
        </div>
        <button className="small-control" type="button">
          รายวัน
          <ChevronDown size={14} />
        </button>
      </div>
      <div className="chart-legend" aria-hidden="true">
        <span className="legend-dot income" /> รายรับ
        <span className="legend-dot expense" /> รายจ่าย
        <span className="legend-line" /> เงินสุทธิ
      </div>
      {chartData.length === 0 ? (
        <div className="panel-empty">นำเข้า statement หรือเพิ่มธุรกรรมจริงเพื่อดูกราฟกระแสเงินสด</div>
      ) : (
        <div className="cash-chart" aria-label="กราฟกระแสเงินสด">
          {chartData.map((item, index) => {
            const netHeight = Math.max(12, Math.min(92, (item.net || 0) * 1.45 * Math.min(rangeFactor, 1.25)));

            return (
              <div className="cash-day" key={`${item.day}-${index}`}>
                <div className="net-point" style={{ bottom: `${netHeight}%` }} />
                <div className="cash-bars">
                  <span className="income-bar" style={{ height: `${item.income || 8}%` }} />
                  <span className="expense-bar" style={{ height: `${item.expense || 8}%` }} />
                </div>
                <em>{item.day}</em>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
