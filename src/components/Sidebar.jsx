import { CheckCircle2, Home, WalletCards, FileSpreadsheet, Target, TrendingUp, BarChart3, Sparkles, Settings } from "lucide-react";
import Logo from "./Logo";
import { navItems } from "../data/filters";

export default function Sidebar({ activeNav, onChange }) {
  return (
    <aside className="app-sidebar">
      <Logo />
      <nav className="side-nav" aria-label="เมนูหลัก">
        {navItems.map((item) => {
          const iconMap = {
            Home,
            WalletCards,
            FileSpreadsheet,
            Target,
            TrendingUp,
            BarChart3,
            Sparkles,
            Settings,
          };
          const Icon = iconMap[item.icon];
          return (
            <button
              className={activeNav === item.id ? "active" : ""}
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
            >
              {Icon && <Icon size={19} />}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="bank-status">
        <CheckCircle2 size={22} />
        <div>
          <strong>ข้อมูลบนเครื่อง</strong>
          <span>IndexedDB / Local</span>
        </div>
      </div>
    </aside>
  );
}
