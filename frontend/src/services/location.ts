/**
 * Dedicated location service (browser Geolocation API).
 * Notes / limitations:
 *  - Requires HTTPS (or localhost) and explicit user permission.
 *  - A normal website can only receive position while the page is open and active. Browsers pause or throttle
 *    watchPosition when the tab is closed or backgrounded, and iOS Safari suspends it almost immediately.
 *    This is NOT native background tracking.
 */
export type PermState = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'unknown';
export interface Coords { lat: number; lng: number; accuracy?: number }

export const isSupported = () => typeof navigator !== 'undefined' && 'geolocation' in navigator;
export const isSecure = () => typeof window !== 'undefined' && (window.isSecureContext || location.hostname === 'localhost');

export async function permissionState(): Promise<PermState> {
  if (!isSupported()) return 'unsupported';
  try {
    if (!navigator.permissions) return 'unknown';
    const s = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return s.state as PermState;
  } catch { return 'unknown'; }
}

export function explainError(e: GeolocationPositionError | Error): string {
  const code = (e as GeolocationPositionError).code;
  if (code === 1) return 'Location permission was denied. You can still use RaktSaathi; requests will be matched by city. To change this, allow location for this site in your browser or phone settings.';
  if (code === 2) return 'Your position could not be determined. Check that location services are turned on.';
  if (code === 3) return 'Getting your position took too long. Please try again.';
  return e.message || 'Location is unavailable';
}

export function getCurrentPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!isSupported()) return reject(new Error('This browser does not support location'));
    if (!isSecure()) return reject(new Error('Location needs a secure (HTTPS) connection'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) => reject(e), { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  });
}

/** Returns a stop function. */
export function watchPosition(onPos: (c: Coords) => void, onErr: (e: GeolocationPositionError) => void): () => void {
  if (!isSupported()) return () => undefined;
  const id = navigator.geolocation.watchPosition(
    (p) => onPos({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }), onErr,
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 15000 });
  return () => navigator.geolocation.clearWatch(id);
}
