import axios from 'axios';

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
export const TOKEN_KEY = 'rs_token';

export const http = axios.create({ baseURL: `${API_URL}/api`, timeout: 20000 });
http.interceptors.request.use((cfg) => {
  const t = localStorage.getItem(TOKEN_KEY);
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
http.interceptors.response.use((r) => r, (err) => {
  if (axios.isAxiosError(err) && err.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event('rs:logout'));
  }
  return Promise.reject(err);
});

export function errMsg(e: unknown): string {
  if (axios.isAxiosError(e)) {
    if (!e.response) return 'Cannot reach the server. Check your connection and that the API is running.';
    const d = e.response.data as { error?: string; details?: Record<string, string[]> } | undefined;
    const first = d?.details && typeof d.details === 'object' ? Object.entries(d.details).map(([k, v]) => `${k}: ${v?.[0]}`)[0] : undefined;
    return d?.error ? (first ? `${d.error} (${first})` : d.error) : `Request failed (${e.response.status})`;
  }
  return e instanceof Error ? e.message : 'Something went wrong';
}

export const api = {
  get: <T>(url: string, params?: object) => http.get<T>(url, { params }).then((r) => r.data),
  post: <T>(url: string, body?: object) => http.post<T>(url, body ?? {}).then((r) => r.data),
  put: <T>(url: string, body?: object) => http.put<T>(url, body ?? {}).then((r) => r.data),
  patch: <T>(url: string, body?: object) => http.patch<T>(url, body ?? {}).then((r) => r.data),
  del: <T>(url: string) => http.delete<T>(url).then((r) => r.data)
};
