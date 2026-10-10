import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../api/finance.api';

export const financeKeys = {
  all: ['finance'],
  summary: (params) => [...financeKeys.all, 'summary', params],
  events: () => [...financeKeys.all, 'events'],
};

export function useFinanceSummary(params) {
  return useQuery({
    queryKey: financeKeys.summary(params),
    queryFn: () => financeApi.summary(params),
    staleTime: 30 * 1000,
  });
}

export function useFinanceEvents() {
  return useQuery({
    queryKey: financeKeys.events(),
    queryFn: () => financeApi.events(),
    staleTime: 30 * 1000,
  });
}
