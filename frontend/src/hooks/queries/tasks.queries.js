import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../api/tasks.api';

export const tasksKeys = {
  all: ['tasks'],
  list: (params) => [...tasksKeys.all, 'list', params],
  overview: () => [...tasksKeys.all, 'overview'],
};

export function useTasksList(params) {
  return useQuery({ queryKey: tasksKeys.list(params), queryFn: () => tasksApi.list(params), placeholderData: keepPreviousData });
}

export function useTasksOverview() {
  return useQuery({ queryKey: tasksKeys.overview(), queryFn: () => tasksApi.overview(), staleTime: 15 * 1000 });
}

// Every task change refreshes the board and the overview together, and the dashboard's open-task count.
function useInvalidate() {
  const qc = useQueryClient();
  return () => Promise.all([qc.invalidateQueries({ queryKey: tasksKeys.all }), qc.invalidateQueries({ queryKey: ['dashboard'] })]);
}

export function useCreateTask() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (body) => tasksApi.create(body), onSuccess: invalidate });
}

export function useUpdateTask() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: ({ id, ...body }) => tasksApi.update(id, body), onSuccess: invalidate });
}

export function useDeleteTask() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id) => tasksApi.remove(id), onSuccess: invalidate });
}
