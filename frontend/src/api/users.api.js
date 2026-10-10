import http from './axiosInstance';

export const usersApi = {
  search: (params) => http.get('/users', { params }).then((r) => r.data),
  listStaff: (params) => http.get('/users/staff', { params }).then((r) => r.data),
  createStaff: (body) => http.post('/users/staff', body).then((r) => r.data),
  updateStaff: (id, body) => http.patch(`/users/staff/${id}`, body).then((r) => r.data),
};
