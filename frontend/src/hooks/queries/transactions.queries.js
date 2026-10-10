import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '../../api/transactions.api';

export const transactionsKeys = {
  all: ['transactions'],
  list: (params) => [...transactionsKeys.all, 'list', params],
};

export function useTransactionsList(params) {
  return useQuery({ queryKey: transactionsKeys.list(params), queryFn: () => transactionsApi.list(params) });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => transactionsApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: transactionsKeys.all });
      qc.invalidateQueries({ queryKey: ['finance'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
