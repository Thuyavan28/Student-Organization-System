import http from './axiosInstance';

export const membershipsApi = {
  tiers: () => http.get('/membership/tiers').then((r) => r.data),
  createTier: (body) => http.post('/membership/tiers', body).then((r) => r.data),
  updateTier: (id, body) => http.patch(`/membership/tiers/${id}`, body).then((r) => r.data),
  join: (body) => http.post('/membership/join', body).then((r) => r.data),
  renew: (body) => http.post('/membership/renew', body).then((r) => r.data),
};
