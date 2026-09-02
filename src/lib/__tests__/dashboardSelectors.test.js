import { describe, expect, it } from "vitest";
import { selectTransactions } from "../dashboardSelectors";

const transactions = [
  {
    id: "1",
    date: "2026-08-15",
    title: "Salary",
    categoryId: "cat-income",
    category: "income",
    categoryLabel: "รายได้ประจำ",
    account: "bank",
    accountLabel: "บัญชีหลัก",
    source: "statement",
    income: 5000000,
    expense: 0,
  },
  {
    id: "2",
    date: "2026-07-10",
    title: "Coffee shop",
    categoryId: "cat-food",
    category: "food",
    categoryLabel: "อาหาร",
    account: "cash",
    accountLabel: "เงินสด",
    source: "statement",
    income: 0,
    expense: 15000,
  },
  {
    id: "3",
    date: "2025-01-01",
    title: "Old expense",
    categoryId: "cat-food",
    category: "food",
    categoryLabel: "อาหาร",
    account: "bank",
    accountLabel: "บัญชีหลัก",
    source: "statement",
    income: 0,
    expense: 30000,
  },
];

const allFilters = {
  account: "all",
  category: "all",
  range: "all",
  search: "",
  source: "all",
};

describe("selectTransactions", () => {
  it("filters rows and aggregates matching metrics in one pass", () => {
    const result = selectTransactions(
      transactions,
      { ...allFilters, account: "bank", range: "this_year" },
      new Date(2026, 8, 2)
    );

    expect(result.rows.map((row) => row.id)).toEqual(["1"]);
    expect(result.income).toBe(5000000);
    expect(result.expense).toBe(0);
  });

  it("keeps metrics independent from the text search", () => {
    const result = selectTransactions(
      transactions,
      { ...allFilters, search: "coffee" },
      new Date(2026, 8, 2)
    );

    expect(result.rows.map((row) => row.id)).toEqual(["2"]);
    expect(result.income).toBe(5000000);
    expect(result.expense).toBe(45000);
  });

  it("supports both canonical and legacy category ids", () => {
    const canonical = selectTransactions(
      transactions,
      { ...allFilters, category: "cat-food" },
      new Date(2026, 8, 2)
    );
    const legacy = selectTransactions(
      transactions,
      { ...allFilters, category: "food" },
      new Date(2026, 8, 2)
    );

    expect(canonical.rows).toHaveLength(2);
    expect(legacy.rows).toHaveLength(2);
  });
});
