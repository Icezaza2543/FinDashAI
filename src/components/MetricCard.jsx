import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export default function MetricCard({ label, value, detail, icon: Icon, tone, trend }) {
  const TrendIcon = trend === "down" ? ArrowDownRight : ArrowUpRight;

  return (
    <article className={`metric-card ${tone}`}>
      <div className="metric-icon">
        <Icon size={22} />
      </div>
      <div className="metric-menu" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>
        {detail}
        <TrendIcon size={14} />
      </small>
    </article>
  );
}
