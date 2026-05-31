import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CategoryManager from '../CategoryManager';
import financeStore from '../../lib/financeStore';

vi.mock('../../lib/financeStore', () => ({
  default: {
    createCategory: vi.fn(),
    deleteCategory: vi.fn(),
    createCategoryRule: vi.fn(),
  }
}));

describe('CategoryManager', () => {
  const mockCategories = [
    { id: 'cat-food', label: 'Food' },
    { id: 'cat-user-1', label: 'Custom' }
  ];

  const mockRules = [
    { id: 'rule-1', pattern: 'coffee', category_id: 'cat-food', priority: 60 }
  ];

  it('renders categories and rules correctly', () => {
    render(
      <CategoryManager 
        categories={mockCategories}
        rules={mockRules}
        onChanged={vi.fn()}
      />
    );

    expect(screen.getAllByText('Food').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Custom').length).toBeGreaterThan(0);
    expect(screen.getByTitle('coffee')).toBeInTheDocument();
  });

  it('can trigger create category', async () => {
    financeStore.createCategory.mockResolvedValueOnce({});
    const onChanged = vi.fn();
    
    render(
      <CategoryManager 
        categories={mockCategories}
        rules={mockRules}
        onChanged={onChanged}
      />
    );

    const input = screen.getByPlaceholderText('เช่น ค่าใช้จ่ายส่วนตัว, การศึกษา');
    const btn = screen.getByRole('button', { name: /เพิ่ม$/ });
    
    fireEvent.change(input, { target: { value: 'New Cat' } });
    fireEvent.click(btn);
    
    await waitFor(() => {
      expect(financeStore.createCategory).toHaveBeenCalledWith({ label: 'New Cat' });
      expect(onChanged).toHaveBeenCalled();
    });
  });
});
