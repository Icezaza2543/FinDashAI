import { useState, useEffect, useRef } from "react";
import { FileSpreadsheet, Upload, CheckCircle, AlertCircle, X } from "lucide-react";
import financeStore from "../lib/financeStore";

export default function ImportPanel({ visible, onImported }) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [importSuccess, setImportSuccess] = useState(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!visible) return;

    let isMounted = true;

    const loadAccounts = async () => {
      try {
        const accs = await financeStore.getAccounts().catch(() => []);
        if (isMounted) {
          setAccounts(accs || []);
          setSelectedAccountId((current) => current || (accs && accs[0]?.id) || "");
        }
      } catch {
        if (isMounted) {
          setAccounts([]);
          setSelectedAccountId("");
        }
      }
    };

    loadAccounts();

    return () => { isMounted = false; };
  }, [visible]);

  if (!visible) return null;

  const triggerFilePicker = () => {
    setError("");
    setResult(null);
    setImportSuccess(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files && event.target.files[0];
    // reset input so same file can be re-chosen
    event.target.value = "";

    if (!file) return;

    setError("");
    setResult(null);
    setImportSuccess(null);
    setSelectedFile(file);
    setSelectedFileName(file.name);

    setIsLoading(true);

    try {
      const parseResult = await financeStore.previewImport(file, selectedAccountId || accounts[0]?.id);
      if (parseResult?.success) {
        setResult({
          transactions: parseResult.transactions || [],
          count: parseResult.count ?? parseResult.transactions?.length ?? 0,
          encoding_used: parseResult.encoding_used || "อัตโนมัติ",
          detected_bank: parseResult.detected_bank || "อัตโนมัติ",
        });
      } else {
        setError(parseResult?.error || "ไม่สามารถอ่านไฟล์ได้");
        setSelectedFile(null);
        setSelectedFileName("");
      }
    } catch (e) {
      setError("เกิดข้อผิดพลาด: " + (e?.message || String(e)));
      setSelectedFile(null);
      setSelectedFileName("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !selectedAccountId) {
      setError("กรุณาเลือกไฟล์และบัญชีปลายทางก่อนนำเข้า หากยังไม่มีบัญชีให้เพิ่มในเมนูบัญชีและกระเป๋า");
      return;
    }

    setIsLoading(true);
    setError("");
    setImportSuccess(null);

    try {
      const importResult = await financeStore.importFromFile(selectedFile, selectedAccountId);

      if (!importResult?.success) {
        throw new Error(importResult?.error || "ไม่สามารถบันทึกข้อมูลลง local storage ได้");
      }

      const selectedAcc = accounts.find((a) => a.id === selectedAccountId);

      setImportSuccess({
        imported: importResult.imported || 0,
        skipped: importResult.skipped || 0,
        accountName: selectedAcc?.name || "บัญชีที่เลือก",
      });

      setResult(null);
      setSelectedFile(null);
      setSelectedFileName("");
      onImported?.();
    } catch (e) {
      setError("เกิดข้อผิดพลาด: " + (e?.message || String(e)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseResult = () => {
    setResult(null);
    setSelectedFile(null);
    setSelectedFileName("");
    setImportSuccess(null);
    setError("");
  };

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <section className="import-panel">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <div className="import-copy">
        <Upload size={21} />
        <div>
          <strong>นำเข้าข้อมูลจริงจาก Statement</strong>
          <span>
            รองรับ CSV และ Excel .xlsx จากธนาคารไทย — ทำงานแบบ Offline 100% (เก็บใน IndexedDB ของเบราว์เซอร์)
          </span>
        </div>
      </div>

      <div className="import-actions">
        <button type="button" onClick={triggerFilePicker} disabled={isLoading || accounts.length === 0}>
          <FileSpreadsheet size={17} />
          {isLoading ? "กำลังอ่านไฟล์..." : "เลือกไฟล์ CSV / XLSX"}
        </button>
      </div>

      {accounts.length === 0 && (
        <div className="import-warning">
          <AlertCircle size={16} />
          เพิ่มบัญชีธนาคารหรือบัญชีเงินสดก่อน จึงจะนำเข้า statement ได้
        </div>
      )}

      {/* เลือกบัญชีปลายทาง */}
      {accounts.length > 0 && (
        <div className="import-account-select">
          <label>นำเข้าลงบัญชี:</label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            disabled={isLoading || !!result}
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.institution ? `${acc.name} · ${acc.institution}` : acc.name} (คงเหลือ ฿{(acc.current_balance / 100).toLocaleString("th-TH")})
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="import-error">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* แสดงผลสำเร็จหลังนำเข้า */}
      {importSuccess && (
        <div className="import-success">
          <div className="success-header">
            <CheckCircle size={20} />
            <strong>นำเข้าสำเร็จ!</strong>
          </div>
          <div className="success-details">
            นำเข้า <strong>{importSuccess.imported}</strong> รายการ ลงใน <strong>{importSuccess.accountName}</strong><br />
            ข้ามรายการซ้ำ: {importSuccess.skipped} รายการ
          </div>
          <button className="close-success" onClick={() => setImportSuccess(null)}>
            <X size={14} /> ปิด
          </button>
        </div>
      )}

      {/* ผลการวิเคราะห์ไฟล์ + ปุ่มนำเข้า */}
      {result && (
        <div className="import-result">
          <div className="result-header">
            <CheckCircle size={18} className="success" />
            <strong>วิเคราะห์ไฟล์สำเร็จ</strong>
            <span className="file-name">{selectedFileName}</span>
            <span className="count">{result.count ?? result.transactions.length} รายการ</span>
            <button className="close-preview" onClick={handleCloseResult} title="ปิด">
              <X size={14} />
            </button>
          </div>

          <div className="result-meta">
            Encoding: {result.encoding_used} • ตรวจพบ: {result.detected_bank || "อัตโนมัติ"}
            {selectedAccount && <> • ปลายทาง: <strong>{selectedAccount.name}</strong></>}
          </div>

          {result.transactions.length > 0 && (
            <div className="preview-list">
              <div className="preview-title">พรีวิว 5 รายการแรกจากไฟล์จริง (จะถูกจัดหมวดหมู่อัตโนมัติจากกฎที่คุณตั้งไว้):</div>
              {result.transactions.slice(0, 5).map((tx, idx) => (
                <div key={idx} className="preview-row">
                  <span className="date">{tx.date}</span>
                  <span className="title">{tx.title}</span>
                  <span className="category">{tx.category_label || "อื่น ๆ"}</span>
                  <span className={tx.amount >= 0 ? "amount in" : "amount out"}>
                    {tx.amount >= 0 ? "+" : ""}{tx.amount.toLocaleString("th-TH")}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            className="import-confirm-btn"
            onClick={handleImport}
            disabled={isLoading || !selectedAccountId}
          >
            {isLoading ? "กำลังนำเข้าข้อมูล..." : "นำเข้าข้อมูลลง local storage (บันทึกถาวร)"}
          </button>

          <div className="import-note">
            ระบบจะใช้กฎจัดหมวดหมู่ที่คุณตั้งไว้ (เช่น BIG C → อาหาร) และป้องกันการนำเข้าซ้ำโดยอัตโนมัติ (รวมกรณีรายการซ้ำใน statement เดียวกัน)
          </div>
        </div>
      )}
    </section>
  );
}
