import { useQuery } from '@tanstack/react-query';
import http from '../../api/axiosInstance';

const usersApi = {
  // Slim list for assignee / officer dropdowns only — never loads the full user table.
  list: (params) => http.get('/users', { params }).then((r) => r.data),
};

export const usersKeys = {
  dropdown: (params) => ['users', 'dropdown', params],
};

// Only called when an assignee modal opens, per section 3.3 of the spec.
export function useUsersDropdown(params, { enabled = false } = {}) {
  return useQuery({
    queryKey: usersKeys.dropdown(params),
    queryFn: () => usersApi.list(params),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
