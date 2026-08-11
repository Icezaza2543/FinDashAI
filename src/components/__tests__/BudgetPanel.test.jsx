import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BudgetPanel from '../BudgetPanel';

describe('BudgetPanel', () => {
  it('renders empty message when no budgets exist', () => {
    render(<BudgetPanel budgets={[]} transactions={[]} />);
    expect(screen.getByText('ยังไม่มีงบประมาณที่บันทึกไว้')).toBeInTheDocument();
    expect(screen.getByText('เพิ่มงบประมาณในเมนูนี้เพื่อเริ่มติดตามรายจ่ายรายหมวด')).toBeInTheDocument();
  });

  it('renders budget rows with calculated usage percent', () => {
    const budgets = [
      { id: 'b-1', category_id: 'cat-food', category_label: 'อาหารและเครื่องดื่ม', monthly_limit: 1000000 },
      { id: 'b-2', category_id: 'cat-shopping', category_label: 'ช้อปปิ้ง', monthly_limit: 500000 },
    ];

    const transactions = [
      { id: 't-1', categoryId: 'cat-food', expense: 500000 },
      { id: 't-2', categoryId: 'cat-shopping', expense: 600000 },
    ];

    render(<BudgetPanel budgets={budgets} transactions={transactions} />);

    expect(screen.getByText('อาหารและเครื่องดื่ม')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('ช้อปปิ้ง')).toBeInTheDocument();
    expect(screen.getByText('120%')).toBeInTheDocument();
  });
});
