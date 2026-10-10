import http from './axiosInstance';

export const checkinsApi = {
  verify: (body) => http.post('/checkins/verify', body).then((r) => r.data),
};
