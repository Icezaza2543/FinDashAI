import { useState } from "react";
import { Check, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import financeStore from "../lib/financeStore";

export default function CategoryManager({ categories = [], rules = [], onChanged }) {
  const [catLabel, setCatLabel] = useState("");
  const [rulePattern, setRulePattern] = useState("");
  const [ruleCatId, setRuleCatId] = useState(categories?.[0]?.id || "cat-other");
  const [rulePriority, setRulePriority] = useState(60);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [categoryDraft, setCategoryDraft] = useState("");
  const [editingRuleId, setEditingRuleId] = useState("");
  const [ruleDraft, setRuleDraft] = useState({ pattern: "", category_id: "cat-other", priority: 60 });

  const showNote = (m, t = 2200) => {
    setNote(m);
    window.setTimeout(() => setNote(""), t);
  };

  const refresh = () => {
    if (onChanged) onChanged();
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!catLabel.trim()) return;
    setBusy(true);
    try {
      await financeStore.createCategory({ label: catLabel.trim() });
      setCatLabel("");
      refresh();
      showNote("เพิ่มหมวดหมู่แล้ว");
    } catch (err) {
      showNote(err?.message || "เพิ่มหมวดไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCategory = async (id, label) => {
    if (!window.confirm(`ลบหมวด "${label}" ? (ต้องไม่มีธุรกรรมหรืองบใช้อยู่)`)) return;
    setBusy(true);
    try {
      await financeStore.deleteCategory(id);
      refresh();
      showNote("ลบหมวดแล้ว");
    } catch (err) {
      showNote(err?.message || "ลบหมวดไม่สำเร็จ (อาจถูกใช้อยู่)");
    } finally {
      setBusy(false);
    }
  };

  const startEditCategory = (category) => {
    setEditingRuleId("");
    setEditingCategoryId(category.id);
    setCategoryDraft(category.label || "");
  };

  const cancelEditCategory = () => {
    setEditingCategoryId("");
    setCategoryDraft("");
  };

  const handleUpdateCategory = async (id) => {
    if (!categoryDraft.trim()) return;
    setBusy(true);
    try {
      await financeStore.updateCategory(id, { label: categoryDraft.trim() });
      cancelEditCategory();
      refresh();
      showNote("แก้ไขหมวดหมู่แล้ว");
    } catch (err) {
      showNote(err?.message || "แก้ไขหมวดไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    if (!rulePattern.trim() || !ruleCatId) return;
    setBusy(true);
    try {
      await financeStore.createCategoryRule({
        pattern: rulePattern.trim(),
        category_id: ruleCatId,
        priority: rulePriority,
      });
      setRulePattern("");
      refresh();
      showNote("เพิ่มกฎการจัดหมวดแล้ว • กฎใหม่จะใช้กับการนำเข้าถัดไป (กด Re-apply เพื่อปรับรายการเก่า)");
    } catch (err) {
      showNote(err?.message || "เพิ่มกฎไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteRule = async (id, pattern) => {
    if (!window.confirm(`ลบกฎ "${pattern}" ?`)) return;
    setBusy(true);
    try {
      await financeStore.deleteCategoryRule(id);
      refresh();
      showNote("ลบกฎแล้ว");
    } catch (err) {
      showNote(err?.message || "ลบกฎไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const getRuleCategoryId = (rule) => rule.category_id || rule.categoryId || "cat-other";

  const startEditRule = (rule) => {
    setEditingCategoryId("");
    setEditingRuleId(rule.id);
    setRuleDraft({
      pattern: rule.pattern || "",
      category_id: getRuleCategoryId(rule),
      priority: Number(rule.priority) || 50,
    });
  };

  const cancelEditRule = () => {
    setEditingRuleId("");
    setRuleDraft({ pattern: "", category_id: "cat-other", priority: 60 });
  };

  const handleUpdateRule = async (id) => {
    if (!ruleDraft.pattern.trim() || !ruleDraft.category_id) return;
    setBusy(true);
    try {
      await financeStore.updateCategoryRule(id, {
        pattern: ruleDraft.pattern.trim(),
        category_id: ruleDraft.category_id,
        priority: Number(ruleDraft.priority) || 50,
      });
      cancelEditRule();
      refresh();
      showNote("แก้ไขกฎแล้ว");
    } catch (err) {
      showNote(err?.message || "แก้ไขกฎไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const handleRecategorize = async (force = false) => {
    if (!force && !window.confirm("นำกฎปัจจุบันไปใช้กับรายการที่ยังไม่ถูกกำหนดเองทั้งหมด?\n(รายการที่เปลี่ยนหมวดด้วยมือจะถูกข้าม)")) return;
    setBusy(true);
    try {
      const res = await financeStore.recategorizeTransactions({ force });
      refresh();
      showNote(`ปรับหมวดแล้ว ${res.updated} รายการ (ข้าม manual ${res.skippedManual})`);
    } catch (err) {
      showNote(err?.message || "ปรับหมวดไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const sortedRules = [...rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  const isDefaultRule = (r) => !String(r.id || "").startsWith("rule-"); // seeded numeric ids are defaults

  return (
    <div className="category-manager">
      <div className="cm-header">
        <div>
          <h3>หมวดหมู่และกฎอัตโนมัติ</h3>
          <p>กำหนดหมวดเอง + กฎจับคู่ข้อความ (contains/regex) สำหรับจัดหมวดตอนนำเข้าและปรับย้อนหลัง</p>
        </div>
        <button type="button" className="small-control" onClick={() => handleRecategorize(false)} disabled={busy}>
          <RefreshCw size={14} /> Re-apply Rules
        </button>
      </div>

      {note && <div className="cm-note">{note}</div>}

      <div className="cm-grid">
        {/* Add Category */}
        <form className="cm-form" onSubmit={handleCreateCategory}>
          <h4>เพิ่มหมวดหมู่ใหม่</h4>
          <div className="cm-row">
            <input
              value={catLabel}
              onChange={(e) => setCatLabel(e.target.value)}
              placeholder="เช่น ค่าใช้จ่ายส่วนตัว, การศึกษา"
              disabled={busy}
            />
            <button type="submit" className="add-button small" disabled={busy || !catLabel.trim()}>
              <Plus size={15} /> เพิ่ม
            </button>
          </div>
          <small className="cm-hint">หมวดเริ่มต้นระบบลบไม่ได้ถ้ามีธุรกรรมใช้อยู่</small>
        </form>

        {/* Add Rule */}
        <form className="cm-form" onSubmit={handleCreateRule}>
          <h4>เพิ่มกฎจับคู่ข้อความ → หมวด</h4>
          <div className="cm-row">
            <input
              value={rulePattern}
              onChange={(e) => setRulePattern(e.target.value)}
              placeholder="เช่น grab|foodpanda|ร้านอาหาร (regex หรือคำ)"
              disabled={busy}
              style={{ flex: 1.6 }}
            />
            <select
              value={ruleCatId}
              onChange={(e) => setRuleCatId(e.target.value)}
              disabled={busy}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <input
              type="number"
              value={rulePriority}
              onChange={(e) => setRulePriority(Number(e.target.value) || 50)}
              min={1}
              max={999}
              title="ลำดับความสำคัญ (สูง=ใช้ก่อน)"
              style={{ width: 68 }}
              disabled={busy}
            />
            <button type="submit" className="add-button small" disabled={busy || !rulePattern.trim()}>
              <Plus size={15} /> เพิ่มกฎ
            </button>
          </div>
          <small className="cm-hint">ตัวอย่าง: "shopee|ลาซาด้า" หรือ regex ".*(uber|grab).*" • กฎใหม่มีผลกับ import ใหม่ทันที</small>
        </form>
      </div>

      {/* Lists */}
      <div className="cm-lists">
        <div className="cm-list">
          <h4>หมวดหมู่ทั้งหมด ({categories.length})</h4>
          <ul>
            {categories.length === 0 && <li className="empty">ยังไม่มีหมวด</li>}
            {categories.map((c) => {
              const isSystem = String(c.id).startsWith("cat-") && !String(c.id).startsWith("cat-user-");
              const isEditing = editingCategoryId === c.id;
              return (
                <li className={isEditing ? "editing" : ""} key={c.id}>
                  {isEditing ? (
                    <>
                      <input
                        className="cm-edit-input"
                        value={categoryDraft}
                        onChange={(e) => setCategoryDraft(e.target.value)}
                        disabled={busy}
                        autoFocus
                      />
                      <button type="button" className="icon-btn confirm" onClick={() => handleUpdateCategory(c.id)} disabled={busy || !categoryDraft.trim()} title="บันทึก">
                        <Check size={14} />
                      </button>
                      <button type="button" className="icon-btn" onClick={cancelEditCategory} disabled={busy} title="ยกเลิก">
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span>{c.label}</span>
                      <span className="cm-meta">{isSystem ? "ระบบ" : "กำหนดเอง"}</span>
                      {!isSystem && (
                        <>
                          <button type="button" className="icon-btn" onClick={() => startEditCategory(c)} disabled={busy} title="แก้ไข">
                            <Pencil size={14} />
                          </button>
                          <button type="button" className="icon-btn danger" onClick={() => handleDeleteCategory(c.id, c.label)} disabled={busy} title="ลบ">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="cm-list rules">
          <h4>กฎการจัดหมวด ({rules.length}) • สูง→ต่ำ</h4>
          <ul>
            {sortedRules.length === 0 && <li className="empty">ยังไม่มีกฎ (ใช้ค่าเริ่มต้น)</li>}
            {sortedRules.map((r) => {
              const cat = categories.find((c) => c.id === getRuleCategoryId(r));
              const def = isDefaultRule(r);
              const isEditing = editingRuleId === r.id;
              return (
                <li className={isEditing ? "editing rule-editing" : ""} key={r.id}>
                  {isEditing ? (
                    <>
                      <input
                        className="cm-edit-input rule"
                        value={ruleDraft.pattern}
                        onChange={(e) => setRuleDraft((draft) => ({ ...draft, pattern: e.target.value }))}
                        disabled={busy}
                        autoFocus
                      />
                      <select
                        value={ruleDraft.category_id}
                        onChange={(e) => setRuleDraft((draft) => ({ ...draft, category_id: e.target.value }))}
                        disabled={busy}
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                      <input
                        className="cm-priority-input"
                        type="number"
                        min={1}
                        max={999}
                        value={ruleDraft.priority}
                        onChange={(e) => setRuleDraft((draft) => ({ ...draft, priority: Number(e.target.value) || 50 }))}
                        disabled={busy}
                      />
                      <button type="button" className="icon-btn confirm" onClick={() => handleUpdateRule(r.id)} disabled={busy || !ruleDraft.pattern.trim()} title="บันทึกกฎ">
                        <Check size={14} />
                      </button>
                      <button type="button" className="icon-btn" onClick={cancelEditRule} disabled={busy} title="ยกเลิก">
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="rule-pattern" title={r.pattern}>/{r.pattern}/i</span>
                      <span className="cm-meta">→ {cat?.label || getRuleCategoryId(r)}</span>
                      <span className="cm-pri">P{r.priority || 0}</span>
                      {!def && (
                        <>
                          <button type="button" className="icon-btn" onClick={() => startEditRule(r)} disabled={busy} title="แก้ไขกฎกำหนดเอง">
                            <Pencil size={14} />
                          </button>
                          <button type="button" className="icon-btn danger" onClick={() => handleDeleteRule(r.id, r.pattern)} disabled={busy} title="ลบกฎกำหนดเอง">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                      {def && <span className="cm-meta">ค่าเริ่มต้น</span>}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          <small className="cm-hint">กฎค่าเริ่มต้นระบบไม่สามารถลบได้จากที่นี่ (เพื่อความปลอดภัย) • สามารถ override ด้วยกฎ custom ที่ priority สูงกว่า</small>
        </div>
      </div>

      <div className="cm-actions">
        <button type="button" className="small-control" onClick={() => handleRecategorize(true)} disabled={busy}>
          Force Re-apply (รวม manual)
        </button>
        <span className="cm-hint">ใช้เมื่อต้องการปรับหมวดทั้งหมดตามกฎล่าสุด (ระวัง: เขียนทับการปรับมือ)</span>
      </div>
    </div>
  );
}
