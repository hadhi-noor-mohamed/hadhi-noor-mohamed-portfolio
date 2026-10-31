/* eslint-disable react-refresh/only-export-components -- context modules intentionally export a provider and its hook */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, api } from '@/lib/api';
import type { SessionUser } from '@/types/api';

interface LoginResult {
  user: SessionUser;
}

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  /** True when the last login attempt requires a TOTP code. */
  mfaRequired: boolean;
  login: (email: string, password: string, code?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const result = await api.get<{ user: SessionUser | null }>('/api/admin/auth/me');
      setUser(result.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string, code?: string) => {
    setMfaRequired(false);
    try {
      const result = await api.post<LoginResult>('/api/admin/auth/login', { email, password, ...(code ? { code } : {}) });
      setUser(result.data.user);
    } catch (error) {
      if (error instanceof ApiError && error.details && typeof error.details === 'object' && 'mfaRequired' in error.details) {
        setMfaRequired(true);
      }
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/admin/auth/logout');
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, mfaRequired, login, logout, refresh }),
    [user, loading, mfaRequired, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
