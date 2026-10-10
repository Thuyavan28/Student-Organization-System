import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../api/tasks.api';

export const tasksKeys = {
  all: ['tasks'],
  list: (params) => [...tasksKeys.all, 'list', params],
};

export function useTasksList(params) {
  return useQuery({ queryKey: tasksKeys.list(params), queryFn: () => tasksApi.list(params), enabled: Boolean(params?.fundraiserId) });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => tasksApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: tasksKeys.all }),
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => tasksApi.updateStatus(id, status),
    // Optimistic update: change the status immediately in the UI.
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: tasksKeys.all });
      const previous = qc.getQueriesData({ queryKey: tasksKeys.all });
      qc.setQueriesData({ queryKey: tasksKeys.all }, (old) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.map((t) => (t.id === id ? { ...t, status } : t)) };
      });
      return { previous };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.previous) qc.setQueriesData({ queryKey: tasksKeys.all }, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: tasksKeys.all }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => tasksApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: tasksKeys.all }),
  });
}
