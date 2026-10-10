import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../../api/orders.api';

export const ordersKeys = {
  all: ['orders'],
  list: (params) => [...ordersKeys.all, 'list', params],
  mine: () => [...ordersKeys.all, 'mine'],
};

export function useOrdersList(params) {
  return useQuery({ queryKey: ordersKeys.list(params), queryFn: () => ordersApi.list(params) });
}

export function useMyOrders() {
  return useQuery({ queryKey: ordersKeys.mine(), queryFn: () => ordersApi.my() });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => ordersApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ordersKeys.all });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => ordersApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ordersKeys.all }),
  });
}
