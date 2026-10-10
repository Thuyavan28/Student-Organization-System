import { createContext, useCallback, useMemo, useState } from 'react';
import { authApi } from '../api/auth.api';
import { getToken, setToken } from '../api/axiosInstance';

export const AuthContext = createContext(null);

function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return { id: Number(payload.sub), name: payload.name, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

function normalizeUser(payload) {
  if (!payload) return null;
  const base = payload.user ?? payload;
  return {
    ...base,
    member: payload.member ?? base.member ?? null,
    leadership: payload.leadership ?? base.leadership ?? [],
  };
}

// Auth state is bootstrapped from the JWT stored in localStorage without a network call.
// The token already contains id, name, email and role (set at login), so the UI renders immediately.
function bootstrapUser() {
  const token = getToken();
  if (!token) return null;
  const claims = decodeToken(token);
  if (!claims) {
    setToken(null);
    return null;
  }
  return { ...claims, member: null, leadership: [] };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(bootstrapUser);

  // Called after login/register where the full user object is in the response body.
  // No follow-up /me call needed.
  const completeAuth = useCallback((body) => {
    setToken(body.data.token);
    const next = normalizeUser(body.data);
    setUser(next);
    return next;
  }, []);

  // Called when we need the member profile (which is not in the JWT).
  const refreshMe = useCallback(async () => {
    const body = await authApi.me();
    const next = normalizeUser(body.data);
    setUser(next);
    return next;
  }, []);

  const login = useCallback(async (email, password) => {
    const body = await authApi.login({ email, password });
    return completeAuth(body);
  }, [completeAuth]);

  const loginWithGoogle = useCallback(async (accessToken, mode = 'login') => {
    const body = await authApi.google(accessToken, mode);
    return completeAuth(body);
  }, [completeAuth]);

  const register = useCallback(async (details) => {
    const body = await authApi.register(details);
    return completeAuth(body);
  }, [completeAuth]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading: false,
      isAuthenticated: Boolean(user),
      isActiveMember: Boolean(user?.member?.isActive),
      login,
      loginWithGoogle,
      register,
      logout,
      refreshMe,
      hasRole: (...roles) => Boolean(user) && roles.includes(user.role),
    }),
    [user, login, loginWithGoogle, register, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
