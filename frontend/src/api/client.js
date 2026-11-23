const base = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    Object.assign(this, { status, code, details });
  }
}

export async function api(path, { token, signal, method = 'GET', body, idempotencyKey } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  let response;
  try {
    response = await fetch(base + path, {
      method, headers, signal, credentials: 'omit', body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(navigator.onLine ? 'The store API is unreachable. Try again shortly.' : 'You’re offline. Reconnect to try again.', 0, 'CONNECTION');
  }
  if (response.status === 204) return { data: null, meta: {} };
  let result;
  try { result = await response.json(); } catch {
    throw new ApiError('The store API did not return a usable response.', response.status, 'BAD_RESPONSE');
  }
  if (!response.ok || result.success !== true) {
    if (response.status === 401 && token) window.dispatchEvent(new CustomEvent('carry-session-ended', { detail: token }));
    const fallback = { 401: 'Sign in to continue.', 403: 'You do not have access to this page.', 409: 'This request conflicts with the current order or stock.', 422: 'Check the indicated fields.', 503: 'This service is temporarily unavailable.' };
    throw new ApiError(result.error?.message || fallback[response.status] || 'The request could not be completed.', response.status, result.error?.code, result.error?.details);
  }
  return result;
}

export function endpoint(path, params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) if (value !== '' && value != null) query.set(key, value);
  return query.size ? path + '?' + query : path;
}
