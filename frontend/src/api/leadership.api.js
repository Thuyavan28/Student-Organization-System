import http from './axiosInstance';

export const leadershipApi = {
  list: (params) => http.get('/leadership', { params }).then((r) => r.data),
  create: (body) => http.post('/leadership', body).then((r) => r.data),
  update: (id, body) => http.patch(`/leadership/${id}`, body).then((r) => r.data),
};
