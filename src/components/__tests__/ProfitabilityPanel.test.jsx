import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProfitabilityPanel from '../ProfitabilityPanel';

describe('ProfitabilityPanel', () => {
  it('renders empty message when no account or transaction data exists', () => {
    render(<ProfitabilityPanel accountCount={0} metrics={null} transactions={[]} />);
    expect(screen.getByText('เพิ่มบัญชีหรือนำเข้า statement เพื่อดูสุขภาพการเงินจริง')).toBeInTheDocument();
  });

  it('renders financial health metrics correctly when data exists', () => {
    const metrics = {
      income: 50000,
      expense: 30000,
      savingsRate: 40,
    };
    const transactions = [{ id: 'tx-1' }, { id: 'tx-2' }];

    render(<ProfitabilityPanel accountCount={2} metrics={metrics} transactions={transactions} />);

    expect(screen.getByText('Profitability')).toBeInTheDocument();
    expect(screen.getByText('เงินสุทธิ')).toBeInTheDocument();
    expect(screen.getByText('อัตราออม')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText('2 รายการ')).toBeInTheDocument();
    expect(screen.getByText('2 บัญชี')).toBeInTheDocument();
  });
});
