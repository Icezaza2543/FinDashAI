export default function BudgetForm({
  draft,
  categories = [],
  onChange,
  submitLabel,
  disabled = false,
}) {
  const categoryOptions =
    categories.length > 0
      ? categories.filter((c) => c.id !== "cat-income")
      : [
          { id: "cat-food", label: "อาหารและเครื่องดื่ม" },
          { id: "cat-housing", label: "ที่อยู่อาศัย" },
          { id: "cat-transport", label: "การเดินทาง" },
          { id: "cat-utility", label: "สาธารณูปโภค" },
          { id: "cat-shopping", label: "ช้อปปิ้ง" },
          { id: "cat-health", label: "สุขภาพ" },
          { id: "cat-entertainment", label: "ความบันเทิง" },
          { id: "cat-other", label: "อื่น ๆ" },
        ];

  return (
    <div className="editor-grid budget-editor-grid">
      <label className="field-stack">
        <span>หมวดหมู่</span>
        <select
          value={draft.category_id}
          onChange={(event) => onChange("category_id", event.target.value)}
          disabled={disabled}
        >
          {categoryOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field-stack">
        <span>งบต่อเดือน (บาท)</span>
        <input
          type="number"
          step="0.01"
          value={draft.monthly_limit}
          onChange={(event) => onChange("monthly_limit", event.target.value)}
          disabled={disabled}
        />
      </label>
      <button className="add-button" type="submit" disabled={disabled}>
        {submitLabel}
      </button>
    </div>
  );
}
