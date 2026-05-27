import { CalendarDays, Landmark, RefreshCw, SlidersHorizontal } from "lucide-react";
import SelectControl from "./SelectControl";
import { ranges, sources } from "../data/filters";

export default function FilterBar({
  range,
  account,
  accounts,
  source,
  refreshCount,
  onRangeChange,
  onAccountChange,
  onSourceChange,
  onRefresh,
}) {
  return (
    <section className="filter-row" aria-label="ตัวกรองแดชบอร์ด">
      <SelectControl
        icon={CalendarDays}
        label="ช่วงเวลา"
        value={range}
        options={ranges}
        onChange={onRangeChange}
      />
      <SelectControl
        icon={Landmark}
        label="บัญชี"
        value={account}
        options={accounts}
        onChange={onAccountChange}
      />
      <SelectControl
        icon={SlidersHorizontal}
        label="แหล่งที่มา"
        value={source}
        options={sources}
        onChange={onSourceChange}
      />
      <button className="refresh-button" type="button" onClick={onRefresh}>
        <RefreshCw size={16} className={refreshCount ? "spin-once" : ""} />
        รีเฟรช
      </button>
      <span className="sync-text">ข้อมูลจากฐานข้อมูลบนเครื่อง</span>
    </section>
  );
}
