import { json } from './http.js';

export async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}

export async function readBody(request) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return { response: json({ ok: false, error: 'forbidden' }, { status: 403 }) };
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return { body };
  } catch {
    return { response: json({ ok: false, error: 'invalid-body' }, { status: 400 }) };
  }
}
