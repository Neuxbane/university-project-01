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
  // super admin: always every feature
  const isAdmin = computed(() => user.value?.role === 'ADMIN');
  const permissionCodes = computed(() => user.value?.permissionCodes || (isAdmin.value ? ['*'] : []));

  /** True when any of the given feature codes is open for this user's role (set in Kelola Sistem). */
  function can(...codes) {
    const granted = permissionCodes.value;
    return granted.includes('*') || codes.some((c) => granted.includes(c));
  }

  // Kelola Sistem shows when at least one of its parts is open
  const SYSTEM_CODES = ['USERS_MANAGE', 'ROLES_MANAGE', 'CSV_IMPORT_EXPORT', 'SYSTEM_BACKUP_RESTORE', 'AUDIT_LOG_VIEW'];
  const canOpenSystem = computed(() => can(...SYSTEM_CODES));

  // first page this role may open (used after login and when a page is closed for the role)
  const HOME_PAGES = [
    ['/dashboard', 'MENU_DASHBOARD'],
    ['/pick-list', 'MENU_PAKET_FULL_BIKE'],
    ['/bundling', 'MENU_BUNDLING'],
    ['/history', 'MENU_RIWAYAT'],
    ['/bolt-specs', 'MENU_MASTER_BARANG'],
    ['/verifikasi', 'VERIFICATION_MANAGE'],
    ['/laporan/waktu', 'REPORT_SERVICE_TIME'],
    ['/admin/import', SYSTEM_CODES],
    ['/help/manual', 'MENU_BUKU_PANDUAN'],
  ];
  const homePath = computed(() => {
    const hit = HOME_PAGES.find(([, code]) => (Array.isArray(code) ? can(...code) : can(code)));
    return hit ? hit[0] : '/tanpa-akses';
  });

  // Role changes made by the super admin apply without logging in again
  let lastRefresh = 0;
  let refreshRequest = null;
  async function refreshMe({ maxAgeMs = 30000 } = {}) {
    if (!token.value || Date.now() - lastRefresh < maxAgeMs) return;
    if (refreshRequest) return refreshRequest;
    const requestedToken = token.value;
    refreshRequest = (async () => {
      try {
        // Avoid redirecting recursively while a navigation guard is awaiting /me.
        const res = await fetch('/api/auth/me', { headers: authHeaders() });
        if (token.value !== requestedToken) return;
        if (res.status === 401) { logout(); return; }
        if (!res.ok) return;
        const data = await res.json();
        if (token.value !== requestedToken) return;
        if (data.user) {
          user.value = { ...user.value, ...data.user };
          lastRefresh = Date.now();
          localStorage.setItem('hextitanium-user', JSON.stringify(user.value));
        }
      } catch {
        // Offline: keep the last known feature list; API permissions remain authoritative.
      }
    })();
    try { await refreshRequest; } finally { refreshRequest = null; }
  }

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
    lastRefresh = Date.now();
    localStorage.setItem('hextitanium-token', data.token);
    localStorage.setItem('hextitanium-user', JSON.stringify(data.user));

    return data.user;
  }

  function logout() {
    lastRefresh = 0;
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
    if (res.status === 403) await refreshMe({ maxAgeMs: 0 });
    return res;
  }

  return {
    token,
    user,
    isAuthenticated,
    isAdmin,
    permissionCodes,
    can,
    canOpenSystem,
    homePath,
    refreshMe,
    login,
    logout,
    handleUnauthorized,
    authHeaders,
    apiFetch,
  };
});
