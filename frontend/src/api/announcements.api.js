import http from './axiosInstance';

export const announcementsApi = {
  list: (params) => http.get('/announcements', { params }).then((r) => r.data),
  history: (params) => http.get('/announcements/history', { params }).then((r) => r.data),
  create: (body) => http.post('/announcements', body).then((r) => r.data),
  update: (id, body) => http.patch(`/announcements/${id}`, body).then((r) => r.data),
  archive: (id) => http.post(`/announcements/${id}/archive`).then((r) => r.data),
};
