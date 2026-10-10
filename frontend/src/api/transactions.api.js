import http from './axiosInstance';

export const transactionsApi = {
  list: (params) => http.get('/transactions', { params }).then((r) => r.data),
  create: (body) => http.post('/transactions', body).then((r) => r.data),
};
