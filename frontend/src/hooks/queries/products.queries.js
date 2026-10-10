import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../../api/products.api';

export const productsKeys = {
  all: ['products'],
  list: (params) => [...productsKeys.all, 'list', params],
};

export function useProductsList(params) {
  return useQuery({
    queryKey: productsKeys.list(params),
    queryFn: () => productsApi.list(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => productsApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: productsKeys.all }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => productsApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: productsKeys.all }),
  });
}

export function useUpdateStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, variantId, stock }) => productsApi.updateStock(productId, variantId, stock),
    onSuccess: () => qc.invalidateQueries({ queryKey: productsKeys.all }),
  });
}
