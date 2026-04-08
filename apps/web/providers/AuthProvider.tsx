'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type UserRole =
  | 'SYSTEM_ADMIN' | 'ADMIN'
  | 'SALES_MANAGER' | 'MANAGER'
  | 'SALES_REP' | 'REP'
  | 'PRODUCTION_MANAGER' | 'PRODUCT_MANAGER';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: verify session via httpOnly cookie → /api/auth/me
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => setUser(data as AuthUser))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? 'Login failed');
    }

    const { user: loggedIn } = await res.json();
    setUser(loggedIn as AuthUser);
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    window.location.href = '/login';
  }, []);

  const hasRole = useCallback(
    (...roles: UserRole[]) => !!user && roles.includes(user.role),
    [user],
  );

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
