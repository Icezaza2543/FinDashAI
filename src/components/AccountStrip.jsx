import { formatMoney } from "../utils/formatters";

export default function AccountStrip({ accountId, accounts = [] }) {
  return (
    <section className="account-strip" aria-label="สถานะบัญชี">
      {accounts.length === 0 ? (
        <article>
          <span>ยังไม่มีบัญชี</span>
          <strong>เพิ่มบัญชีในเมนูบัญชีและกระเป๋า</strong>
        </article>
      ) : (
        accounts.slice(0, 3).map((item) => (
          <article
            className={accountId === item.id ? "selected" : ""}
            key={item.id}
          >
            <span>{item.institution || item.type || "บัญชี"}</span>
            <strong>{formatMoney((item.current_balance || 0) / 100)}</strong>
            <small>{item.name}</small>
          </article>
        ))
      )}
    </section>
  );
}
