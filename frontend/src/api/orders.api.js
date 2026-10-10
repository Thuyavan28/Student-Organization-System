import http from './axiosInstance';

export const ordersApi = {
  create: (items) => http.post('/orders', { items }).then((r) => r.data),
  mine: (params) => http.get('/orders/my', { params }).then((r) => r.data),
  list: (params) => http.get('/orders', { params }).then((r) => r.data),
  updateStatus: (id, status) => http.patch(`/orders/${id}/status`, { status }).then((r) => r.data),
};
