import http from './axiosInstance';

export const expensesApi = {
  create: (formData) =>
    http.post('/expenses', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  mine: (params) => http.get('/expenses/my', { params }).then((r) => r.data),
  list: (params) => http.get('/expenses', { params }).then((r) => r.data),
  review: (id, body) => http.patch(`/expenses/${id}/review`, body).then((r) => r.data),
  reimburse: (id) => http.patch(`/expenses/${id}/reimburse`).then((r) => r.data),
};
