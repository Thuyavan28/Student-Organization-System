import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../api/dashboard.api';

export const dashboardKeys = {
  summary: () => ['dashboard', 'summary'],
  charts: () => ['dashboard', 'charts'],
};

export function useDashboardSummary() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: () => dashboardApi.summary(),
    staleTime: 30 * 1000,
  });
}

export function useDashboardCharts() {
  return useQuery({
    queryKey: dashboardKeys.charts(),
    queryFn: () => dashboardApi.charts(),
    // Charts load after stat cards, so a slightly longer stale time is fine.
    staleTime: 60 * 1000,
  });
}
