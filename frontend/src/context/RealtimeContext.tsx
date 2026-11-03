import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useSnackbar } from 'notistack';
import { API_URL, api, TOKEN_KEY } from '@/services/api';
import { useAuth } from './AuthContext';
import type { NotificationItem } from '@/types';

interface RT {
  socket: Socket | null; notifications: NotificationItem[]; unread: number;
  markRead: (id: string) => Promise<void>; markAllRead: () => Promise<void>; reload: () => Promise<void>;
}
const Ctx = createContext<RT | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const snack = useRef(enqueueSnackbar);
  snack.current = enqueueSnackbar;

  const reload = useCallback(async () => {
    if (!user) return;
    try { setNotifications((await api.get<{ notifications: NotificationItem[] }>('/notifications')).notifications); } catch { /* ignore */ }
  }, [user]);

  useEffect(() => {
    if (!user) { setSocket(null); setNotifications([]); return; }
    const s = io(API_URL, { auth: { token: localStorage.getItem(TOKEN_KEY) }, transports: ['websocket', 'polling'], reconnectionAttempts: Infinity });
    s.on('notification.created', (n: NotificationItem) => {
      setNotifications((prev) => (prev.some((p) => p.id === n.id) ? prev : [{ ...n, readAt: null }, ...prev]));
      snack.current(n.title, { variant: 'info', autoHideDuration: 5000 });
    });
    setSocket(s);
    void reload();
    return () => { s.disconnect(); };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const markRead = useCallback(async (id: string) => {
    setNotifications((p) => p.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)));
    if (!id.startsWith('tmp-')) await api.post(`/notifications/${id}/read`).catch(() => undefined);
  }, []);
  const markAllRead = useCallback(async () => {
    setNotifications((p) => p.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    await api.post('/notifications/read-all').catch(() => undefined);
  }, []);

  const unread = notifications.filter((n) => !n.readAt).length;
  const value = useMemo(() => ({ socket, notifications, unread, markRead, markAllRead, reload }), [socket, notifications, unread, markRead, markAllRead, reload]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRealtime(): RT {
  const v = useContext(Ctx);
  if (!v) throw new Error('useRealtime must be used inside RealtimeProvider');
  return v;
}

/** Re-run `cb` (debounced) whenever any of the listed socket events arrive. */
export function useLiveRefresh(events: string[], cb: () => void) {
  const { socket } = useRealtime();
  const ref = useRef(cb);
  ref.current = cb;
  const key = events.join('|');
  useEffect(() => {
    if (!socket) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const h = () => { clearTimeout(t); t = setTimeout(() => ref.current(), 250); };
    events.forEach((e) => socket.on(e, h));
    return () => { clearTimeout(t); events.forEach((e) => socket.off(e, h)); };
  }, [socket, key]); // eslint-disable-line react-hooks/exhaustive-deps
}
