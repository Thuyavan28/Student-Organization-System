import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { membersApi } from '../../api/members.api';

export const membersKeys = {
  all: ['members'],
  lists: () => [...membersKeys.all, 'list'],
  list: (params) => [...membersKeys.lists(), params],
  expiring: (params) => [...membersKeys.all, 'expiring', params],
  stats: () => [...membersKeys.all, 'stats'],
  detail: (id) => [...membersKeys.all, 'detail', id],
};

export function useMembersList(params) {
  return useQuery({ queryKey: membersKeys.list(params), queryFn: () => membersApi.list(params) });
}

export function useMembersExpiring(params) {
  return useQuery({ queryKey: membersKeys.expiring(params), queryFn: () => membersApi.expiring(params) });
}

export function useMembersStats() {
  return useQuery({ queryKey: membersKeys.stats(), queryFn: () => membersApi.stats(), staleTime: 30 * 1000 });
}

export function useMemberDetail(id) {
  return useQuery({ queryKey: membersKeys.detail(id), queryFn: () => membersApi.get(id), enabled: Boolean(id) });
}

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => membersApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: membersKeys.all }),
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => membersApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: membersKeys.all }),
  });
}

export function useMarkMemberPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => membersApi.markPaid(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: membersKeys.all }),
  });
}
