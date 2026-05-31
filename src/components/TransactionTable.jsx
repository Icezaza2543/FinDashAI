import { useState } from "react";
import { CreditCard, Search, TrendingUp, Upload } from "lucide-react";
import { categories as fallbackCategories } from "../data/filters";
import { formatMoney } from "../utils/formatters";
import SelectControl from "./SelectControl";

// แปลงวันที่ ISO เป็นรูปแบบสั้นที่อ่านง่าย (เช่น 27 พ.ค.)
function formatDateShort(isoDate) {
  if (!isoDate) return "-";
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString("th-TH", { 
      day: "numeric", 
      month: "short" 
    });
  } catch {
    return isoDate;
  }
}

export default function TransactionTable({
  rows,
  search,
  category,
  onSearchChange,
  onCategoryChange,
  onAddTransaction,
  categories = [],
  filterCategories,
  onTransactionCategoryChange,
}) {
  const [hideCategorized, setHideCategorized] = useState(false);
  const catOptions = (categories && categories.length > 0)
    ? categories.map((c) => ({ id: c.id, label: c.label }))
    : fallbackCategories.filter((c) => c.id !== "all");
  const filterOptions = filterCategories?.length ? filterCategories : fallbackCategories;
  
  const displayedRows = hideCategorized ? rows.filter(r => r.categoryId === "cat-other" || !r.categoryId) : rows;

  return (
    <section className="panel transaction-panel">
      <div className="table-toolbar">
        <div>
          <h2>รายการล่าสุด</h2>
          <p>{displayedRows.length} รายการตรงกับตัวกรอง</p>
        </div>
        <div className="table-actions">
          <label className="toggle-field" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', cursor: 'pointer', color: 'var(--text-soft)' }}>
            <input 
              type="checkbox" 
              checked={hideCategorized}
              onChange={(e) => setHideCategorized(e.target.checked)}
            />
            ซ่อนที่จัดหมวดแล้ว
          </label>
          <label className="search-field">
            <Search size={16} />
            <input
              aria-label="ค้นหารายการ"
              placeholder="ค้นหารายการ"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </label>
          <SelectControl
            label="หมวดหมู่"
            value={category}
            options={filterOptions}
            onChange={onCategoryChange}
          />
          <button className="add-button" type="button" onClick={onAddTransaction}>
            <Upload size={17} />
            นำเข้า Statement
          </button>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>วันที่</th>
              <th>รายละเอียด</th>
              <th>หมวดหมู่</th>
              <th>บัญชี/แหล่งที่มา</th>
              <th>รายรับ</th>
              <th>รายจ่าย</th>
              <th>ยอดคงเหลือ</th>
            </tr>
          </thead>
          <tbody>
            {displayedRows.map((row) => (
              <tr key={row.id}>
                <td>{formatDateShort(row.date)}</td>
                <td>
                  <div className="merchant-cell">
                    <span className={row.income ? "merchant-icon income" : "merchant-icon expense"}>
                      {row.income ? <TrendingUp size={14} /> : <CreditCard size={14} />}
                    </span>
                    <strong>{row.title}</strong>
                  </div>
                </td>
                <td>
                  {onTransactionCategoryChange ? (
                    <select
                      className="cat-select-inline"
                      value={row.categoryId || "cat-other"}
                      onChange={(e) => onTransactionCategoryChange(row.id, e.target.value)}
                      title="เปลี่ยนหมวดหมู่สำหรับรายการนี้"
                    >
                      {catOptions.map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  ) : (
                    row.categoryLabel
                  )}
                </td>
                <td>{row.accountLabel || row.account}</td>
                <td className="money-in">{row.income ? formatMoney(row.income / 100) : "-"}</td>
                <td className="money-out">{row.expense ? formatMoney(row.expense / 100) : "-"}</td>
                <td>{row.balance > 0 ? formatMoney(row.balance / 100) : "-"}</td>
              </tr>
            ))}
            {displayedRows.length === 0 ? (
              <tr>
                <td className="empty-row" colSpan="7">
                  ไม่พบรายการที่ตรงกับตัวกรอง
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
