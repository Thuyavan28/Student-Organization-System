import http from './axiosInstance';

export const membersApi = {
  list: (params) => http.get('/members', { params }).then((r) => r.data),
  get: (id) => http.get(`/members/${id}`).then((r) => r.data),
  create: (body) => http.post('/members', body).then((r) => r.data),
  update: (id, body) => http.patch(`/members/${id}`, body).then((r) => r.data),
  me: () => http.get('/members/me').then((r) => r.data),
  stats: () => http.get('/members/stats').then((r) => r.data),
  expiring: (params) => http.get('/members/expiring', { params }).then((r) => r.data),
  runReminders: () => http.post('/members/reminders/run').then((r) => r.data),
  markPaid: (id, body) => http.post(`/members/${id}/mark-paid`, body).then((r) => r.data),
  verify: (id) => http.get(`/members/${id}/verify`).then((r) => r.data),
};
