export default function GoalForm({ draft, onChange, submitLabel, disabled = false }) {
  return (
    <div className="editor-grid goal-editor-grid">
      <label className="field-stack">
        <span>ชื่อเป้าหมาย</span>
        <input
          value={draft.label}
          onChange={(event) => onChange("label", event.target.value)}
          placeholder="เช่น เงินสำรองฉุกเฉิน"
          disabled={disabled}
        />
      </label>
      <label className="field-stack">
        <span>เป้าหมาย (บาท)</span>
        <input
          type="number"
          step="0.01"
          value={draft.target_amount}
          onChange={(event) => onChange("target_amount", event.target.value)}
          disabled={disabled}
        />
      </label>
      <label className="field-stack">
        <span>ออมแล้ว (บาท)</span>
        <input
          type="number"
          step="0.01"
          value={draft.saved_amount}
          onChange={(event) => onChange("saved_amount", event.target.value)}
          disabled={disabled}
        />
      </label>
      <button className="add-button" type="submit" disabled={disabled}>
        {submitLabel}
      </button>
    </div>
  );
}
