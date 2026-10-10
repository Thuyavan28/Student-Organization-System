import http from './axiosInstance';

export const financeApi = {
  summary: (params) => http.get('/finance/summary', { params }).then((r) => r.data),
  eventReport: () => http.get('/finance/events').then((r) => r.data),
  exportCsv: (params) => http.get('/finance/export.csv', { params, responseType: 'blob' }).then((r) => r.data),
};
