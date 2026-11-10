import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

function readStoredUser() {
  try {
    const raw = localStorage.getItem('hextitanium-user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem('hextitanium-user');
    return null;
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('hextitanium-token') || null);
  const user = ref(readStoredUser());

  const isAuthenticated = computed(() => Boolean(token.value && user.value));
  const isAdmin = computed(() => user.value?.role === 'ADMIN');
  const isStaff = computed(() => user.value?.role === 'STAFF' || user.value?.role === 'ADMIN');

  async function login(username, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login gagal.');
    }

    token.value = data.token;
    user.value = data.user;
    localStorage.setItem('hextitanium-token', data.token);
    localStorage.setItem('hextitanium-user', JSON.stringify(data.user));

    return data.user;
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('hextitanium-token');
    localStorage.removeItem('hextitanium-user');
  }

  async function handleUnauthorized() {
    logout();
    try {
      const { default: router } = await import('../router');
      if (router.currentRoute.value.name !== 'login') {
        await router.replace({ name: 'login', query: { expired: '1' } });
      }
    } catch {
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }
  }

  function authHeaders() {
    return token.value ? { Authorization: `Bearer ${token.value}` } : {};
  }

  async function apiFetch(url, options = {}) {
    const headers = {
      ...authHeaders(),
      ...(options.headers || {}),
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      await handleUnauthorized();
      throw new Error('Sesi masuk Anda telah berakhir. Silakan masuk kembali.');
    }
    return res;
  }

  return {
    token,
    user,
    isAuthenticated,
    isAdmin,
    isStaff,
    login,
    logout,
    handleUnauthorized,
    authHeaders,
    apiFetch,
  };
});
