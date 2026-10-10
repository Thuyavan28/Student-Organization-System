import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingsApi } from '../../api/bookings.api';

export const bookingsKeys = {
  all: ['bookings'],
  mine: () => [...bookingsKeys.all, 'mine'],
};

export function useMyBookings() {
  return useQuery({ queryKey: bookingsKeys.mine(), queryFn: () => bookingsApi.my() });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, ...body }) => bookingsApi.create(eventId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bookingsKeys.all });
      qc.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
