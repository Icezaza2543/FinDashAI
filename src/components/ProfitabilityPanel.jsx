import { ShieldCheck } from "lucide-react";
import { formatMoney, formatPlain } from "../utils/formatters";

export default function ProfitabilityPanel({ accountCount = 0, metrics, transactions = [] }) {
  const income = metrics?.income || 0;
  const expense = metrics?.expense || 0;
  const net = income - expense;
  const hasData = accountCount > 0 || transactions.length > 0;

  const healthRows = [
    {
      label: "เงินสุทธิ",
      value: formatMoney(net),
      detail: net >= 0 ? "รายรับมากกว่ารายจ่าย" : "รายจ่ายมากกว่ารายรับ",
    },
    {
      label: "อัตราออม",
      value: `${formatPlain(metrics?.savingsRate || 0)}%`,
      detail: income > 0 ? "คำนวณจากรายรับจริง" : "รอข้อมูลรายรับ",
    },
    {
      label: "ธุรกรรม",
      value: `${transactions.length.toLocaleString("th-TH")} รายการ`,
      detail: "ตามตัวกรองปัจจุบัน",
    },
    {
      label: "บัญชี",
      value: `${accountCount.toLocaleString("th-TH")} บัญชี`,
      detail: "บันทึกใน SQLite",
    },
  ];

  return (
    <section className="panel profitability-panel">
      <div className="panel-header compact">
        <div>
          <h2>Profitability</h2>
          <p>สุขภาพการเงินจากข้อมูลจริง</p>
        </div>
        <ShieldCheck size={19} />
      </div>
      {!hasData ? (
        <div className="panel-empty">เพิ่มบัญชีหรือนำเข้า statement เพื่อดูสุขภาพการเงินจริง</div>
      ) : (
        <>
          <div className="health-grid">
            {healthRows.map((item) => (
              <article key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.detail}</small>
              </article>
            ))}
          </div>
          <div className="cash-plan">
            <div>
              <span>สถานะเงินสุทธิ</span>
              <strong>
                {net >= 0
                  ? `ยังเหลือ ${formatMoney(net)} หลังหักรายจ่าย`
                  : `ต้องชดเชยส่วนติดลบ ${formatMoney(Math.abs(net))}`}
              </strong>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
