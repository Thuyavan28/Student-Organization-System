import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checkinsApi } from '../../api/checkins.api';

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token) => checkinsApi.checkIn(token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  });
}
