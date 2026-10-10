import http from './axiosInstance';

export const paymentsApi = {
  createSession: (data) => http.post('/payments/session', data).then((r) => r.data),
  getSession: (id) => http.get(`/payments/session/${id}`).then((r) => r.data),
  approve: (id) => http.post(`/payments/session/${id}/approve`).then((r) => r.data),
  reject: (id) => http.post(`/payments/session/${id}/reject`).then((r) => r.data),
  getLanIp: () => http.get('/payments/lan-ip').then((r) => r.data),
};
