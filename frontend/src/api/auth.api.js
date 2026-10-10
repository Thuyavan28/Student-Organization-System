import http from './axiosInstance';

export const authApi = {
  register: (body) => http.post('/auth/register', body).then((r) => r.data),
  login: (body) => http.post('/auth/login', body).then((r) => r.data),
  me: () => http.get('/auth/me').then((r) => r.data),
};
