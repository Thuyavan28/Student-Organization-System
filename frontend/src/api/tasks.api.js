import http from './axiosInstance';

export const tasksApi = {
  list: (params) => http.get('/tasks', { params }).then((r) => r.data),
  create: (body) => http.post('/tasks', body).then((r) => r.data),
  update: (id, body) => http.patch(`/tasks/${id}`, body).then((r) => r.data),
  assignees: (params) => http.get('/users', { params }).then((r) => r.data),
};
