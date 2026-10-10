import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { membershipsApi } from '../../api/memberships.api';

export const membershipsKeys = {
  tiers: () => ['memberships', 'tiers'],
  myMembership: () => ['memberships', 'me'],
};

export function useMembershipTiers() {
  return useQuery({
    queryKey: membershipsKeys.tiers(),
    queryFn: () => membershipsApi.listTiers(),
    // Tiers rarely change — keep for 10 minutes.
    staleTime: 10 * 60 * 1000,
  });
}

export function useMyMembership() {
  return useQuery({ queryKey: membershipsKeys.myMembership(), queryFn: () => membershipsApi.me() });
}

export function useJoinMembership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => membershipsApi.join(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memberships'] }),
  });
}

export function useRenewMembership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => membershipsApi.renew(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memberships'] }),
  });
}
