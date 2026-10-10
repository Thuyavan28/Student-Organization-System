import axios from 'axios';

const TOKEN_KEY = 'clubflow_token';

let memoryToken = null;

export function getToken() {
  if (memoryToken) return memoryToken;
  try {
    memoryToken = localStorage.getItem(TOKEN_KEY);
  } catch {
    memoryToken = null;
  }
  return memoryToken;
}

export function setToken(token) {
  memoryToken = token;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    memoryToken = token;
  }
}

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

const axiosInstance = axios.create({ baseURL: API_URL });

axiosInstance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRoute = /\/auth\/(login|register)$/.test(error.config?.url || '');
    if (error.response?.status === 401 && !isAuthRoute && getToken()) {
      setToken(null);
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.assign(`/login?next=${next}`);
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return error?.response?.data?.error?.message || (error?.request ? 'Cannot reach the server.' : fallback);
}

export function apiFieldErrors(error) {
  const fields = error?.response?.data?.error?.details?.fieldErrors;
  if (!fields) return {};
  return Object.fromEntries(
    Object.entries(fields).map(([name, messages]) => [name, Array.isArray(messages) ? messages[0] : messages]),
  );
}

export default axiosInstance;
