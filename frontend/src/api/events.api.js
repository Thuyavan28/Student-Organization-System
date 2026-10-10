import http from './axiosInstance';

export const eventsApi = {
  list: (params) => http.get('/events', { params }).then((r) => r.data),
  get: (id) => http.get(`/events/${id}`).then((r) => r.data),
  create: (body) => http.post('/events', body).then((r) => r.data),
  update: (id, body) => http.patch(`/events/${id}`, body).then((r) => r.data),
  publish: (id) => http.post(`/events/${id}/publish`).then((r) => r.data),
  setStatus: (id, status) => http.post(`/events/${id}/status`, { status }).then((r) => r.data),
  stats: (id) => http.get(`/events/${id}/stats`).then((r) => r.data),
  bookings: (id, params) => http.get(`/events/${id}/bookings`, { params }).then((r) => r.data),
  checkins: (id, params) => http.get(`/events/${id}/checkins`, { params }).then((r) => r.data),
};
