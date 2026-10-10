import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/auth.api';
import { getToken, setToken } from '../api/axiosInstance';

export const AuthContext = createContext(null);

function normalizeUser(payload) {
  if (!payload) return null;
  const base = payload.user ?? payload;
  return {
    ...base,
    member: payload.member ?? base.member ?? null,
    leadership: payload.leadership ?? base.leadership ?? [],
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  const refreshMe = useCallback(async () => {
    const body = await authApi.me();
    const next = normalizeUser(body.data);
    setUser(next);
    return next;
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    refreshMe()
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, [refreshMe]);

  const completeAuth = useCallback(
    async (body) => {
      setToken(body.data.token);
      return refreshMe();
    },
    [refreshMe],
  );

  const login = useCallback(async (email, password) => completeAuth(await authApi.login({ email, password })), [completeAuth]);

  const register = useCallback(async (details) => completeAuth(await authApi.register(details)), [completeAuth]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isActiveMember: Boolean(user?.member?.isActive),
      login,
      register,
      logout,
      refreshMe,
      hasRole: (...roles) => Boolean(user) && roles.includes(user.role),
    }),
    [user, loading, login, register, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
