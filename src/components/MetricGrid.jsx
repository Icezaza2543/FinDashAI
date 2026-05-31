import { LineChart, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import MetricCard from "./MetricCard";
import { formatMoney, formatPlain } from "../utils/formatters";

export default function MetricGrid({ metrics, isLoading }) {
  return (
    <section className="metric-grid" aria-label="ตัวเลขสำคัญ">
      <MetricCard
        label="รายรับ"
        value={formatMoney(metrics.income)}
        detail="คำนวณจากข้อมูลจริงในตัวกรอง"
        icon={TrendingUp}
        tone="income"
        isLoading={isLoading}
      />
      <MetricCard
        label="รายจ่าย"
        value={formatMoney(metrics.expense)}
        detail="คำนวณจากข้อมูลจริงในตัวกรอง"
        icon={TrendingDown}
        tone="expense"
        trend="down"
        isLoading={isLoading}
      />
      <MetricCard
        label="เงินคงเหลือ"
        value={formatMoney(metrics.balance)}
        detail="รวมจากบัญชีที่บันทึกไว้"
        icon={WalletCards}
        tone="balance"
        isLoading={isLoading}
      />
      <MetricCard
        label="อัตราออม"
        value={`${formatPlain(metrics.savingsRate)}%`}
        detail={metrics.income > 0 ? "รายรับเทียบรายจ่ายจริง" : "ยังไม่มีรายรับในตัวกรอง"}
        icon={LineChart}
        tone="savings"
        isLoading={isLoading}
      />
    </section>
  );
}
