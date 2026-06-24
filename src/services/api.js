const apiBaseUrl = String(process.env.EXPO_PUBLIC_API_URL || '').trim().replace(/\/+$/, '');

export const hasApiBaseUrl = Boolean(apiBaseUrl);

async function request(path, { method = 'GET', body, token } = {}) {
  if (!hasApiBaseUrl) {
    throw new Error('API base URL is not configured.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(payload?.error || `Request failed with status ${response.status}.`);
      error.status = response.status;
      error.details = payload?.details || null;
      throw error;
    }

    return payload;
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error('The server took too long to respond. Please try again.');
      timeoutError.code = 'REQUEST_TIMEOUT';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  login: (body) => request('/auth/login', { method: 'POST', body }),
  register: (body) => request('/auth/register', { method: 'POST', body }),
  me: (token) => request('/auth/me', { token }),
  bootstrap: (token) => request('/app/bootstrap', { token }),
  updateProfile: (token, body) => request('/me', { method: 'PATCH', token, body }),
  createProduct: (token, body) => request('/products', { method: 'POST', token, body }),
  updateProduct: (token, id, body) => request(`/products/${id}`, { method: 'PATCH', token, body }),
  updateProductAvailability: (token, id, body) =>
    request(`/products/${id}/availability`, { method: 'PATCH', token, body }),
  removeProduct: (token, id) => request(`/products/${id}`, { method: 'DELETE', token }),
  restoreProduct: (token, id) => request(`/products/${id}/restore`, { method: 'POST', token }),
  createOrder: (token, body) => request('/orders', { method: 'POST', token, body }),
  confirmOrder: (token, id) => request(`/orders/${id}/confirm`, { method: 'POST', token }),
  deliverOrder: (token, id) => request(`/orders/${id}/deliver`, { method: 'POST', token }),
  addReview: (token, id, body) => request(`/orders/${id}/reviews`, { method: 'POST', token, body }),
  toggleUserStatus: (token, id) => request(`/users/${id}/status`, { method: 'PATCH', token }),
  toggleUserVerification: (token, id) => request(`/users/${id}/verification`, { method: 'PATCH', token })
};
