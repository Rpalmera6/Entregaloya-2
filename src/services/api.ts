// src/services/api.ts
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function safeJson(res: Response) {
  try { return await res.json(); } catch { return {}; }
}

async function doFetch(url: string, opts: RequestInit = {}) {
  const defaults: RequestInit = {
    credentials: 'include',
    headers: {},
    method: opts.method || 'GET'
  };
  const mergedHeaders = Object.assign({}, (defaults.headers as any), (opts.headers as any || {}));
  const finalOpts: RequestInit = { ...defaults, ...opts, headers: mergedHeaders };
  // console.debug('[api] fetch', url, finalOpts.method || 'GET');
  return fetch(url, finalOpts);
}

export async function getJson(path: string) {
  const url = `${API_BASE}${path}`;
  const res = await doFetch(url, { method: 'GET' });
  const json = await safeJson(res);
  return { ok: res.ok, status: res.status, data: json };
}

export async function postJson(path: string, body: any) {
  const url = `${API_BASE}${path}`;
  const res = await doFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await safeJson(res);
  return { ok: res.ok, status: res.status, data: json };
}

export async function putJson(path: string, body: any) {
  const url = `${API_BASE}${path}`;
  const res = await doFetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await safeJson(res);
  return { ok: res.ok, status: res.status, data: json };
}

/**
 * getImageUrl(relativePath)
 * Devuelve la URL procesada por Vite para assets locales (desde código en /src).
 * Uso típico: getImageUrl('../assets/mi-imagen.jpg')
 */
export function getImageUrl(relativePath: string): string {
  try {
    // import.meta.url es la ubicación del módulo actual; Vite procesará este new URL(...) en build
    return new URL(relativePath, import.meta.url).href;
  } catch (e) {
    // fallback: devolver la propia ruta relativa (si algo falla)
    // eslint-disable-next-line no-console
    console.error('getImageUrl error for', relativePath, e);
    return relativePath;
  }
}
