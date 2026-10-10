import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { announcementsApi } from '../../api/announcements.api';

export const announcementsKeys = {
  all: ['announcements'],
  list: (params) => [...announcementsKeys.all, 'list', params],
  history: () => [...announcementsKeys.all, 'history'],
};

export function useAnnouncementsList(params) {
  return useQuery({ queryKey: announcementsKeys.list(params), queryFn: () => announcementsApi.list(params) });
}

export function useAnnouncementsHistory() {
  return useQuery({ queryKey: announcementsKeys.history(), queryFn: () => announcementsApi.history() });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => announcementsApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: announcementsKeys.all }),
  });
}

export function useArchiveAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => announcementsApi.archive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: announcementsKeys.all }),
  });
}

export function usePinAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pinned }) => announcementsApi.setPin(id, pinned),
    onSuccess: () => qc.invalidateQueries({ queryKey: announcementsKeys.all }),
  });
}
