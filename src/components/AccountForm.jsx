const ACCOUNT_TYPE_OPTIONS = [
  { id: "bank", label: "บัญชีธนาคาร" },
  { id: "credit", label: "บัตรเครดิต" },
  { id: "cash", label: "เงินสด" },
];

export default function AccountForm({ draft, onChange, submitLabel, disabled = false }) {
  return (
    <div className="editor-grid">
      <label className="field-stack">
        <span>ชื่อบัญชี</span>
        <input
          value={draft.name}
          onChange={(event) => onChange("name", event.target.value)}
          placeholder="เช่น บัญชีเงินเดือน, บัตรเครดิตสะสมแต้ม"
          disabled={disabled}
        />
      </label>
      <label className="field-stack">
        <span>ธนาคาร / สถาบัน</span>
        <input
          value={draft.institution}
          onChange={(event) => onChange("institution", event.target.value)}
          placeholder="เช่น กสิกรไทย, ไทยพาณิชย์"
          list="institution-options"
          disabled={disabled}
        />
        <datalist id="institution-options">
          <option value="กสิกรไทย" />
          <option value="ไทยพาณิชย์" />
          <option value="กรุงเทพ" />
          <option value="กรุงไทย" />
          <option value="กรุงศรี" />
          <option value="ทหารไทยธนชาต" />
          <option value="ออมสิน" />
          <option value="KTC" />
        </datalist>
      </label>
      <label className="field-stack">
        <span>ประเภท</span>
        <select
          value={draft.type}
          onChange={(event) => onChange("type", event.target.value)}
          disabled={disabled}
        >
          {ACCOUNT_TYPE_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field-stack">
        <span>ยอดคงเหลือ (บาท)</span>
        <input
          type="number"
          step="0.01"
          value={draft.current_balance}
          onChange={(event) => onChange("current_balance", event.target.value)}
          disabled={disabled}
        />
      </label>
      <button className="add-button" type="submit" disabled={disabled}>
        {submitLabel}
      </button>
    </div>
  );
}
