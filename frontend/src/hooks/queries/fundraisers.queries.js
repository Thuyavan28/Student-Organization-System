import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fundraisersApi } from '../../api/fundraisers.api';

export const fundraisersKeys = {
  all: ['fundraisers'],
  list: (params) => [...fundraisersKeys.all, 'list', params],
  detail: (id) => [...fundraisersKeys.all, 'detail', id],
  summary: (id) => [...fundraisersKeys.all, 'summary', id],
};

export function useFundraisersList(params) {
  return useQuery({ queryKey: fundraisersKeys.list(params), queryFn: () => fundraisersApi.list(params) });
}

export function useFundraiserDetail(id) {
  return useQuery({ queryKey: fundraisersKeys.detail(id), queryFn: () => fundraisersApi.get(id), enabled: Boolean(id) });
}

export function useFundraiserSummary(id) {
  return useQuery({ queryKey: fundraisersKeys.summary(id), queryFn: () => fundraisersApi.summary(id), enabled: Boolean(id) });
}

export function useCreateFundraiser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => fundraisersApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: fundraisersKeys.all }),
  });
}

export function useUpdateFundraiser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => fundraisersApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: fundraisersKeys.all }),
  });
}
