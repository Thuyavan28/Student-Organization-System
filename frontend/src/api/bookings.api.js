import http from './axiosInstance';

export const bookingsApi = {
  create: (eventId) => http.post(`/events/${eventId}/bookings`, {}).then((r) => r.data),
  mine: (params) => http.get('/bookings/my', { params }).then((r) => r.data),
  cancel: (id) => http.post(`/bookings/${id}/cancel`).then((r) => r.data),
};
