import http from './axiosInstance';

export const productsApi = {
  list: (params) => http.get('/products', { params }).then((r) => r.data),
  create: (body) => http.post('/products', body).then((r) => r.data),
  update: (id, body) => http.patch(`/products/${id}`, body).then((r) => r.data),
  updateStock: (productId, variantId, stock) =>
    http.patch(`/products/${productId}/variants/${variantId}`, { stock }).then((r) => r.data),
};
