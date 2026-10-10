import http from './axiosInstance';

export const dashboardApi = {
  summary: () => http.get('/dashboard/summary').then((r) => r.data),
};
