import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leadershipApi } from '../../api/leadership.api';

export const leadershipKeys = {
  all: ['leadership'],
  list: () => [...leadershipKeys.all, 'list'],
};

export function useLeadershipList() {
  return useQuery({ queryKey: leadershipKeys.list(), queryFn: () => leadershipApi.list(), staleTime: 5 * 60 * 1000 });
}

export function useAddLeadership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => leadershipApi.add(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: leadershipKeys.all }),
  });
}

export function useRemoveLeadership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => leadershipApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: leadershipKeys.all }),
  });
}
