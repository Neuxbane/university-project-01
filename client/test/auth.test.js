import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '../src/stores/auth.js';

beforeEach(() => {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  setActivePinia(createPinia());
});

function storedSession(codes = ['MENU_PAKET_FULL_BIKE']) {
  localStorage.setItem('hextitanium-token', 'test-session');
  localStorage.setItem('hextitanium-user', JSON.stringify({ role: 'STAFF', permissionCodes: codes }));
  return useAuthStore();
}

test('An existing session follows changed permissions without signing in again', async () => {
  const auth = storedSession();
  assert.equal(auth.homePath, '/pick-list');
  globalThis.fetch = async () => new Response(JSON.stringify({ user: { role: 'STAFF', permissionCodes: [] } }));
  await auth.refreshMe({ maxAgeMs: 0 });
  assert.equal(auth.isAuthenticated, true);
  assert.equal(auth.can('MENU_PAKET_FULL_BIKE'), false);
  assert.equal(auth.homePath, '/tanpa-akses');
  globalThis.fetch = async () => new Response(JSON.stringify({ user: { role: 'STAFF', permissionCodes: ['ROLES_MANAGE'] } }));
  await auth.refreshMe({ maxAgeMs: 0 });
  assert.equal(auth.homePath, '/admin/import');
  assert.equal(auth.canOpenSystem, true);
});

test('An expired session clears stored credentials during refresh', async () => {
  const auth = storedSession();
  globalThis.fetch = async () => new Response('{}', { status: 401 });
  await auth.refreshMe({ maxAgeMs: 0 });
  assert.equal(auth.isAuthenticated, false);
  assert.equal(localStorage.getItem('hextitanium-token'), null);
});

test('An in-flight refresh cannot restore a user after logout', async () => {
  const auth = storedSession();
  let resolve;
  globalThis.fetch = () => new Promise((done) => { resolve = done; });
  const refreshing = auth.refreshMe({ maxAgeMs: 0 });
  auth.logout();
  resolve(new Response(JSON.stringify({ user: { role: 'ADMIN', permissionCodes: ['*'] } })));
  await refreshing;
  assert.equal(auth.user, null);
  assert.equal(localStorage.getItem('hextitanium-user'), null);
});

test('A denied API action refreshes permissions without retrying the mutation', async () => {
  const auth = storedSession(['MENU_RIWAYAT', 'SESSION_CHECKLIST']);
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    return url === '/api/auth/me'
      ? new Response(JSON.stringify({ user: { role: 'STAFF', permissionCodes: ['MENU_RIWAYAT'] } }))
      : new Response('{}', { status: 403 });
  };
  const result = await auth.apiFetch('/api/pick-lists/sessions/1/items/1', { method: 'PATCH' });
  assert.equal(result.status, 403);
  assert.deepEqual(calls, ['/api/pick-lists/sessions/1/items/1', '/api/auth/me']);
  assert.equal(auth.can('SESSION_CHECKLIST'), false);
});
