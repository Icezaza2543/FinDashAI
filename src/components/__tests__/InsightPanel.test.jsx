import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import InsightPanel from '../InsightPanel';

describe('InsightPanel', () => {
  it('renders empty message when no transactions exist', () => {
    render(<InsightPanel transactions={[]} />);
    expect(screen.getByText('ยังไม่มีข้อมูลจริงเพียงพอสำหรับสร้าง insight')).toBeInTheDocument();
  });

  it('renders top expense and positive net insights correctly', () => {
    const transactions = [
      { id: 'tx-1', income: 5000000, expense: 0, categoryLabel: 'รายได้ประจำ' },
      { id: 'tx-2', income: 0, expense: 1200000, categoryLabel: 'อาหารและเครื่องดื่ม' },
      { id: 'tx-3', income: 0, expense: 800000, categoryLabel: 'ช้อปปิ้ง' },
    ];

    render(<InsightPanel transactions={transactions} />);

    expect(screen.getByText(/รายจ่ายสูงสุดคือ อาหารและเครื่องดื่ม/)).toBeInTheDocument();
    expect(screen.getByText(/เงินสุทธิเป็นบวก/)).toBeInTheDocument();
  });

  it('renders warning when expense exceeds income', () => {
    const transactions = [
      { id: 'tx-1', income: 1000000, expense: 0, categoryLabel: 'รายได้ประจำ' },
      { id: 'tx-2', income: 0, expense: 2500000, categoryLabel: 'ที่อยู่อาศัย' },
    ];

    render(<InsightPanel transactions={transactions} />);

    expect(screen.getByText(/รายจ่ายมากกว่ารายรับ/)).toBeInTheDocument();
  });
});
