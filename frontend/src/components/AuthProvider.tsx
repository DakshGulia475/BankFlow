import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthContext } from '../hooks/useAuth';
import { authApi } from '../services/bankflow';
import type { User } from '../types/api';

const TOKEN_KEY = 'bankflow.token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Restore the session on load: an expired or tampered token simply logs the user out.
  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    authApi
      .me(token)
      .then(({ user: me }) => {
        if (active) {
          setUser(me);
        }
      })
      .catch(() => {
        if (active) {
          logout();
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token, logout]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login({ email, password });
    localStorage.setItem(TOKEN_KEY, result.token);
    setUser(result.user);
    setToken(result.token);
  }, []);

  const value = useMemo(
    () => ({ token, user, loading, login, logout }),
    [token, user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
