import http from './axiosInstance';

export const dashboardApi = {
  summary: () => http.get('/dashboard/summary').then((r) => r.data),
  charts: () => http.get('/dashboard/charts').then((r) => r.data),
};
