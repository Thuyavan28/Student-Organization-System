import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../../api/events.api';

export const eventsKeys = {
  all: ['events'],
  lists: () => [...eventsKeys.all, 'list'],
  list: (params) => [...eventsKeys.lists(), params],
  detail: (id) => [...eventsKeys.all, 'detail', id],
  stats: (id) => [...eventsKeys.all, 'stats', id],
  bookings: (id, params) => [...eventsKeys.all, 'bookings', id, params],
};

export function useEventsList(params) {
  return useQuery({ queryKey: eventsKeys.list(params), queryFn: () => eventsApi.list(params) });
}

export function useEventDetail(id) {
  return useQuery({ queryKey: eventsKeys.detail(id), queryFn: () => eventsApi.get(id), enabled: Boolean(id) });
}

export function useEventStats(id) {
  return useQuery({ queryKey: eventsKeys.stats(id), queryFn: () => eventsApi.stats(id), enabled: Boolean(id) });
}

export function useEventBookings(id, params) {
  return useQuery({ queryKey: eventsKeys.bookings(id, params), queryFn: () => eventsApi.bookings(id, params), enabled: Boolean(id) });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => eventsApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventsKeys.all }),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => eventsApi.update(id, body),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: eventsKeys.all }),
  });
}

export function usePublishEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => eventsApi.publish(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventsKeys.all }),
  });
}

export function useSetEventStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => eventsApi.setStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventsKeys.all }),
  });
}
