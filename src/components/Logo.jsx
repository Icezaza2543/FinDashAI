import { BarChart3 } from "lucide-react";

export default function Logo() {
  return (
    <div className="brand-lockup" aria-label="FinDash AI">
      <span className="brand-mark" aria-hidden="true">
        <BarChart3 size={20} strokeWidth={2.6} />
      </span>
      <span>FinDash AI</span>
    </div>
  );
}
