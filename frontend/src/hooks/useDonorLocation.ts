import { useCallback, useEffect, useRef, useState } from 'react';
import { useSnackbar } from 'notistack';
import { api, errMsg } from '@/services/api';
import { explainError, getCurrentPosition, isSecure, isSupported, permissionState, watchPosition, type Coords, type PermState } from '@/services/location';
import { haversineKm } from '@/utils/format';

/** Manages donor location sharing. Coordinates go only to the donor's own profile on the server; they are never shown to others. */
export function useDonorLocation(initialSharing: boolean, onChanged?: () => void) {
  const { enqueueSnackbar } = useSnackbar();
  const [perm, setPerm] = useState<PermState>('unknown');
  const [sharing, setSharing] = useState(initialSharing);
  const [busy, setBusy] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [position, setPosition] = useState<Coords | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const lastSent = useRef<{ c: Coords; t: number } | null>(null);

  useEffect(() => { setSharing(initialSharing); }, [initialSharing]);
  useEffect(() => { void permissionState().then(setPerm); }, []);

  const push = useCallback(async (c: Coords) => {
    const prev = lastSent.current;
    if (prev && Date.now() - prev.t < 60000 && haversineKm(prev.c, c) < 0.1) return; // throttle: >100 m or >60 s
    lastSent.current = { c, t: Date.now() };
    setPosition(c);
    await api.put('/donor/location', { lat: c.lat, lng: c.lng, accuracy: c.accuracy });
  }, []);

  const stop = useCallback(() => { stopRef.current?.(); stopRef.current = null; }, []);

  const start = useCallback(async () => {
    setBusy(true); setLastError(null);
    try {
      if (!isSupported()) throw new Error('This browser does not support location.');
      if (!isSecure()) throw new Error('Location needs HTTPS (or localhost).');
      const c = await getCurrentPosition();
      await push(c);
      setSharing(true); setPerm('granted');
      stop();
      stopRef.current = watchPosition((p) => { void push(p).catch(() => undefined); }, (e) => setLastError(explainError(e)));
      onChanged?.();
      enqueueSnackbar('Location sharing is on. Only an approximate distance is ever shown.', { variant: 'success' });
    } catch (e) {
      const msg = e instanceof Error && 'code' in e ? explainError(e as GeolocationPositionError) : errMsg(e);
      setLastError(msg); setSharing(false);
      void permissionState().then(setPerm);
    } finally { setBusy(false); }
  }, [push, stop, onChanged, enqueueSnackbar]);

  const turnOff = useCallback(async () => {
    setBusy(true);
    stop();
    try { await api.del('/donor/location'); setSharing(false); setPosition(null); lastSent.current = null; onChanged?.(); enqueueSnackbar('Location sharing is off.', { variant: 'info' }); }
    catch (e) { enqueueSnackbar(errMsg(e), { variant: 'error' }); } finally { setBusy(false); }
  }, [stop, onChanged, enqueueSnackbar]);

  // Resume watching while the page is open if sharing was already enabled and permission is granted
  useEffect(() => {
    if (sharing && perm === 'granted' && !stopRef.current) {
      stopRef.current = watchPosition((p) => { void push(p).catch(() => undefined); }, (e) => setLastError(explainError(e)));
    }
    return () => undefined;
  }, [sharing, perm, push]);
  useEffect(() => stop, [stop]);

  return { perm, sharing, busy, lastError, position, start, turnOff };
}
