import { Bell, ChevronDown, Download, Upload } from "lucide-react";

export default function Topbar({
  activeNavLabel,
  importOpen,
  onImport,
  onExport,
  exportNote,
}) {

  return (
    <header className="app-topbar">
      <div className="title-block">
        <span>{activeNavLabel}</span>
        <h1>{activeNavLabel}</h1>
      </div>
      <div className="topbar-actions">
        <button
          className={importOpen ? "utility-button active" : "utility-button"}
          type="button"
          onClick={onImport}
        >
          <Upload size={17} />
          Import
        </button>
        <button className="utility-button" type="button" onClick={onExport}>
          <Download size={17} />
          Export
        </button>
        <button className="icon-button" type="button" aria-label="ดูการแจ้งเตือน">
          <Bell size={19} />
          <span aria-hidden="true" />
        </button>
        {exportNote ? <div className="toast-note">{exportNote}</div> : null}
      </div>
    </header>
  );
}
