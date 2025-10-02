// src/services/api.ts
const DEFAULT_LOCAL = "http://localhost:5000";

// Preferencia de configuración (build-time via VITE_API_URL)
const BUILD_API = import.meta.env.VITE_API_URL || "";

// Runtime override (útil para ngrok / testing): window.__API_BASE__ = "https://xxxxx.ngrok.io"
function runtimeApiBase(): string | null {
  // @ts-ignore
  if (typeof window !== "undefined" && window.__API_BASE__) {
    // @ts-ignore
    return window.__API_BASE__;
  }
  return null;
}

export const API_BASE: string = (BUILD_API && BUILD_API !== "undefined")
  ? BUILD_API
  : (runtimeApiBase() || DEFAULT_LOCAL);

async function safeJson(res: Response) {
  try { return await res.json(); } catch { return {}; }
}

function buildUrl(path: string) {
  // asegúrate de que path empiece con '/'
  if (!path.startsWith("/")) path = "/" + path;
  return `${API_BASE}${path}`;
}

async function fetchWithTimeout(resource: RequestInfo, options: RequestInit = {}, timeout = 15000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const opts = { ...options, signal: controller.signal } as RequestInit;
  try {
    const res = await fetch(resource, opts);
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function doFetch(url: string, opts: RequestInit = {}) {
  const defaults: RequestInit = {
    credentials: 'include',
    headers: {},
    method: opts.method || 'GET'
  };
  const mergedHeaders = Object.assign({}, (defaults.headers as any), (opts.headers as any || {}));
  const finalOpts: RequestInit = { ...defaults, ...opts, headers: mergedHeaders };

  try {
    const res = await fetchWithTimeout(url, finalOpts, 20000);
    return res;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      // timeout
      console.error('[api] request timeout:', url);
      throw new Error('timeout');
    }
    // Network error (CORS / DNS / connection refused)
    console.error('[api] network error fetching', url, err);
    throw err;
  }
}

export async function getJson(path: string) {
  const url = buildUrl(path);
  try {
    const res = await doFetch(url, { method: 'GET' });
    const json = await safeJson(res);
    return { ok: res.ok, status: res.status, data: json };
  } catch (err: any) {
    return { ok: false, status: 0, data: { msg: String(err.message || err) } };
  }
}

export async function postJson(path: string, body: any) {
  const url = buildUrl(path);
  try {
    const res = await doFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await safeJson(res);
    return { ok: res.ok, status: res.status, data: json };
  } catch (err: any) {
    return { ok: false, status: 0, data: { msg: String(err.message || err) } };
  }
}

export async function putJson(path: string, body: any) {
  const url = buildUrl(path);
  try {
    const res = await doFetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await safeJson(res);
    return { ok: res.ok, status: res.status, data: json };
  } catch (err: any) {
    return { ok: false, status: 0, data: { msg: String(err.message || err) } };
  }
}

/**
 * getImageUrl(relativePath)
 * Devuelve la URL procesada por Vite para assets locales (desde código en /src).
 */
export function getImageUrl(relativePath: string): string {
  try {
    return new URL(relativePath, import.meta.url).href;
  } catch (e) {
    console.error('getImageUrl error for', relativePath, e);
    return relativePath;
  }
}
