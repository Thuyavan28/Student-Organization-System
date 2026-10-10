import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { expensesApi } from '../../api/expenses.api';

export const expensesKeys = {
  all: ['expenses'],
  list: (params) => [...expensesKeys.all, 'list', params],
  mine: () => [...expensesKeys.all, 'mine'],
};

export function useExpensesList(params) {
  return useQuery({ queryKey: expensesKeys.list(params), queryFn: () => expensesApi.list(params) });
}

export function useMyExpenses() {
  return useQuery({ queryKey: expensesKeys.mine(), queryFn: () => expensesApi.my() });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData) => expensesApi.create(formData),
    onSuccess: () => qc.invalidateQueries({ queryKey: expensesKeys.all }),
  });
}

export function useUpdateExpenseStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reimbursedAt }) => expensesApi.updateStatus(id, { status, reimbursedAt }),
    onSuccess: () => qc.invalidateQueries({ queryKey: expensesKeys.all }),
  });
}
