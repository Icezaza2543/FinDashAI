import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TransactionTable from '../TransactionTable';

// Mock formatters so we don't worry about locale specifics
vi.mock('../../utils/formatters', () => ({
  formatMoney: (val) => `฿${val}`
}));

describe('TransactionTable', () => {
  const mockRows = [
    {
      id: 'tx-1',
      date: '2024-05-30',
      title: 'Salary',
      categoryId: 'cat-income',
      categoryLabel: 'Income',
      accountLabel: 'Bank A',
      income: 5000000, // 50000.00 THB
      expense: 0,
      balance: 5000000,
    },
    {
      id: 'tx-2',
      date: '2024-05-31',
      title: 'Coffee',
      categoryId: 'cat-food',
      categoryLabel: 'Food',
      accountLabel: 'Bank A',
      income: 0,
      expense: 15000, // 150.00 THB
      balance: 4985000,
    }
  ];

  it('renders transactions correctly', () => {
    render(
      <TransactionTable
        rows={mockRows}
        search=""
        category="all"
        onSearchChange={vi.fn()}
        onCategoryChange={vi.fn()}
        onAddTransaction={vi.fn()}
      />
    );

    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.getByText('Coffee')).toBeInTheDocument();
    // Verify income/expense formatting using our mock
    expect(screen.getAllByText('฿50000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('฿150').length).toBeGreaterThan(0);
  });

  it('shows empty state when no rows', () => {
    render(
      <TransactionTable
        rows={[]}
        search=""
        category="all"
        onSearchChange={vi.fn()}
        onCategoryChange={vi.fn()}
        onAddTransaction={vi.fn()}
      />
    );

    expect(screen.getByText('ไม่พบรายการที่ตรงกับตัวกรอง')).toBeInTheDocument();
  });

  it('handles search input', () => {
    const onSearchChange = vi.fn();
    render(
      <TransactionTable
        rows={mockRows}
        search=""
        category="all"
        onSearchChange={onSearchChange}
        onCategoryChange={vi.fn()}
        onAddTransaction={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText('ค้นหารายการ');
    fireEvent.change(searchInput, { target: { value: 'cof' } });
    expect(onSearchChange).toHaveBeenCalledWith('cof');
  });
});
