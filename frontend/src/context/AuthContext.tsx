import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, TOKEN_KEY } from '@/services/api';
import type { Me, User } from '@/types';

interface AuthState {
  me: Me | null; user: User | null; loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: object) => Promise<{ pending: boolean; message?: string; user?: User }>;
  logout: () => void; refresh: () => Promise<void>;
}
const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY));

  const refresh = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) { setMe(null); setLoading(false); return; }
    try { setMe(await api.get<Me>('/auth/me')); } catch { localStorage.removeItem(TOKEN_KEY); setMe(null); } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const h = () => setMe(null);
    window.addEventListener('rs:logout', h);
    return () => window.removeEventListener('rs:logout', h);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, r.token);
    await refresh();
    return r.user;
  }, [refresh]);

  const register = useCallback(async (payload: object) => {
    const r = await api.post<{ token?: string; user?: User; pendingApproval?: boolean; message?: string }>('/auth/register', payload);
    if (r.token) { localStorage.setItem(TOKEN_KEY, r.token); await refresh(); return { pending: false, user: r.user }; }
    return { pending: true, message: r.message };
  }, [refresh]);

  const logout = useCallback(() => { localStorage.removeItem(TOKEN_KEY); setMe(null); }, []);
  const value = useMemo(() => ({ me, user: me?.user ?? null, loading, login, register, logout, refresh }), [me, loading, login, register, logout, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
