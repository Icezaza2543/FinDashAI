function getRangeCutoff(rangeId, now) {
  const current = new Date(now);

  if (rangeId === "1m") {
    return new Date(current.getFullYear(), current.getMonth() - 1, current.getDate()).getTime();
  }
  if (rangeId === "3m") {
    return new Date(current.getFullYear(), current.getMonth() - 3, current.getDate()).getTime();
  }
  if (rangeId === "6m") {
    return new Date(current.getFullYear(), current.getMonth() - 6, current.getDate()).getTime();
  }
  if (rangeId === "this_year") {
    return new Date(current.getFullYear(), 0, 1).getTime();
  }

  return null;
}

function isInDateRange(date, cutoff) {
  if (cutoff === null || !date) return true;
  const timestamp = new Date(date).getTime();
  return Number.isNaN(timestamp) || timestamp >= cutoff;
}

function matchesSearch(transaction, query) {
  if (!query) return true;

  return [
    transaction.title,
    transaction.categoryLabel,
    transaction.accountLabel,
    transaction.account,
    transaction.source,
  ].some((value) =>
    String(value || "")
      .toLowerCase()
      .includes(query)
  );
}

/**
 * Filters rows for display and calculates search-independent metrics in one pass.
 * Metrics intentionally follow the account/range/source/category filters only.
 */
export function selectTransactions(transactions, filters, now = new Date()) {
  const { account, category, range, search, source } = filters;
  const cutoff = getRangeCutoff(range, now);
  const query = search.trim().toLowerCase();
  const rows = [];
  let income = 0;
  let expense = 0;

  for (const row of transactions) {
    const baseMatch =
      isInDateRange(row.date, cutoff) &&
      (account === "all" || row.account === account) &&
      (source === "all" || row.source === source) &&
      (category === "all" || row.categoryId === category || row.category === category);

    if (!baseMatch) continue;

    income += row.income || 0;
    expense += row.expense || 0;

    if (matchesSearch(row, query)) rows.push(row);
  }

  return { rows, income, expense };
}
