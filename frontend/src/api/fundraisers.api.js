import http from './axiosInstance';

export const fundraisersApi = {
  list: (params) => http.get('/fundraisers', { params }).then((r) => r.data),
  get: (id) => http.get(`/fundraisers/${id}`).then((r) => r.data),
  create: (body) => http.post('/fundraisers', body).then((r) => r.data),
  update: (id, body) => http.patch(`/fundraisers/${id}`, body).then((r) => r.data),
  remove: (id) => http.delete(`/fundraisers/${id}`).then((r) => r.data),
  summary: (id) => http.get(`/fundraisers/${id}/summary`).then((r) => r.data),
  addIncome: (id, body) => http.post(`/fundraisers/${id}/income`, body).then((r) => r.data),
};
