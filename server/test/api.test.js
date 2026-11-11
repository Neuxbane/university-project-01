const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const app = require('../src/app');

let server;
let baseUrl;
let adminToken;
let staffToken;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

describe('Hex Titanium Bolt System API Tests', () => {
  test('1. GET /api/health should return ok and backend port', async () => {
    const { status, data } = await apiRequest('/api/health');
    assert.equal(status, 200);
    assert.equal(data.status, 'ok');
    assert.ok(data.port);
  });

  test('2. Auth login: valid and invalid credentials', async () => {
    // Invalid
    const invalid = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: 'wrongpassword' },
    });
    assert.equal(invalid.status, 401);

    // Valid Admin
    const adminLogin = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: 'admin123' },
    });
    assert.equal(adminLogin.status, 200);
    assert.ok(adminLogin.data.token);
    assert.equal(adminLogin.data.user.role, 'ADMIN');
    adminToken = adminLogin.data.token;

    // Valid Staff
    const staffLogin = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { username: 'staff', password: 'staff123' },
    });
    assert.equal(staffLogin.status, 200);
    assert.ok(staffLogin.data.token);
    assert.equal(staffLogin.data.user.role, 'STAFF');
    staffToken = staffLogin.data.token;
  });

  test('3. GET /api/motorcycles returns at least 20 popular types', async () => {
    const { status, data } = await apiRequest('/api/motorcycles', { token: staffToken });
    assert.equal(status, 200);
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 20, `Expected at least 20 motorcycles, got ${data.length}`);
  });

  test('4. POST /api/pick-lists/generate produces grouped and consolidated totals for NMAX 155', async () => {
    // Find NMAX 155
    const { data: motorcycles } = await apiRequest('/api/motorcycles', { token: staffToken });
    const nmax = motorcycles.find((m) => m.displayName.includes('NMAX 155'));
    assert.ok(nmax, 'NMAX 155 should be in seeded data');

    const { status, data } = await apiRequest('/api/pick-lists/generate', {
      method: 'POST',
      token: staffToken,
      body: { motorcycleTypeId: nmax.id },
    });

    assert.equal(status, 200);
    assert.equal(data.motorcycle.id, nmax.id);
    assert.ok(data.summary.totalQuantity > 0, 'Total quantity should be greater than 0');
    assert.ok(data.consolidatedTotals.length > 0, 'Consolidated totals should not be empty');
    assert.ok(data.positionBreakdown.length > 0, 'Position breakdown should not be empty');

    // Check aggregation: HEX-M6-25-FL appears in both CVT (6) and Right Crankcase (5) -> Total should be 11
    const m6_25 = data.consolidatedTotals.find((item) => item.code === 'HEX-M6-25-FL');
    assert.ok(m6_25, 'HEX-M6-25-FL should be present in consolidated totals');
    assert.equal(m6_25.totalQuantity, 11, 'HEX-M6-25-FL should aggregate to 11');
  });

  test('5. Role authorization: staff cannot create motorcycle, admin can', async () => {
    const testModel = `TestBike_${Date.now()}`;
    // Staff attempt
    const staffAttempt = await apiRequest('/api/motorcycles', {
      method: 'POST',
      token: staffToken,
      body: {
        brand: 'Yamaha',
        model: testModel,
        variant: 'Sport 150',
        yearStart: 2024,
      },
    });
    assert.equal(staffAttempt.status, 403);

    // Admin attempt
    const adminAttempt = await apiRequest('/api/motorcycles', {
      method: 'POST',
      token: adminToken,
      body: {
        brand: 'Yamaha',
        model: testModel,
        variant: 'Sport 150',
        yearStart: 2024,
      },
    });
    assert.equal(adminAttempt.status, 201);
    assert.equal(adminAttempt.data.displayName, `Yamaha ${testModel} Sport 150 (2024)`);
  });

  test('6. Pick session lifecycle: create, check item, auto-complete', async () => {
    const { data: motorcycles } = await apiRequest('/api/motorcycles', { token: staffToken });
    const nmax = motorcycles.find((m) => m.displayName.includes('NMAX 155'));

    // Create session
    const createRes = await apiRequest('/api/pick-lists/sessions', {
      method: 'POST',
      token: staffToken,
      body: {
        motorcycleTypeId: nmax.id,
        notes: 'Uji coba sesi ambil baut staf',
        items: [
          { boltSpecId: 1, quantity: 2, positionSummary: 'Kaliper Depan' },
        ],
      },
    });
    assert.equal(createRes.status, 201);
    const session = createRes.data;
    assert.equal(session.status, 'IN_PROGRESS');

    // Check the item
    const itemId = session.items[0].id;
    const patchRes = await apiRequest(`/api/pick-lists/sessions/${session.id}/items/${itemId}`, {
      method: 'PATCH',
      token: staffToken,
      body: { checked: true },
    });
    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.data.sessionStatus, 'COMPLETED');
    assert.equal(patchRes.data.isAllChecked, true);
  });

  test('7. Multi-photo gallery: add photo, set primary, delete photo for bolt and motorcycle', async () => {
    // 1. Get a bolt spec
    const { data: specs } = await apiRequest('/api/bolt-specs', { token: adminToken });
    assert.ok(specs.length > 0);
    const targetSpec = specs[0];

    // Add photo to bolt spec
    const addBoltPhoto = await apiRequest(`/api/bolt-specs/${targetSpec.id}/images`, {
      method: 'POST',
      token: adminToken,
      body: {
        url: '/uploads/bolts/test-bolt-photo.svg',
        caption: 'Uji Coba Anodize Biru Glossy',
        isPrimary: false,
      },
    });
    assert.equal(addBoltPhoto.status, 201);
    const createdBoltImg = addBoltPhoto.data.find((img) => img.caption === 'Uji Coba Anodize Biru Glossy');
    assert.ok(createdBoltImg);

    // Set as primary
    const setPrimaryBolt = await apiRequest(`/api/bolt-specs/${targetSpec.id}/images/${createdBoltImg.id}/primary`, {
      method: 'PATCH',
      token: adminToken,
    });
    assert.equal(setPrimaryBolt.status, 200);
    const updatedBoltImg = setPrimaryBolt.data.find((img) => img.id === createdBoltImg.id);
    assert.equal(updatedBoltImg.isPrimary, true);

    // Delete bolt photo
    const deleteBoltPhoto = await apiRequest(`/api/bolt-specs/${targetSpec.id}/images/${createdBoltImg.id}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.equal(deleteBoltPhoto.status, 200);

    // 2. Get a motorcycle
    const { data: motors } = await apiRequest('/api/motorcycles', { token: adminToken });
    const targetMotor = motors[0];

    // Add photo to motorcycle
    const addMotorPhoto = await apiRequest(`/api/motorcycles/${targetMotor.id}/images`, {
      method: 'POST',
      token: adminToken,
      body: {
        url: '/uploads/motorcycles/test-bike.svg',
        caption: 'Tampak Depan Visor Sport',
        isPrimary: false,
      },
    });
    assert.equal(addMotorPhoto.status, 201);
    const createdMotorImg = addMotorPhoto.data.find((img) => img.caption === 'Tampak Depan Visor Sport');
    assert.ok(createdMotorImg);

    // Delete motorcycle photo
    const deleteMotorPhoto = await apiRequest(`/api/motorcycles/${targetMotor.id}/images/${createdMotorImg.id}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.equal(deleteMotorPhoto.status, 200);
  });

  test('8. Admin User Management and RBAC permissions', async () => {
    // 1. Staff cannot access /api/users (RBAC check)
    const staffAccess = await apiRequest('/api/users', { token: staffToken });
    assert.equal(staffAccess.status, 403);

    // 2. Authenticated user can fetch RBAC matrix
    const rbacRes = await apiRequest('/api/users/rbac-matrix', { token: staffToken });
    assert.equal(rbacRes.status, 200);
    assert.ok(rbacRes.data.ADMIN);
    assert.ok(rbacRes.data.STAFF);
    assert.ok(rbacRes.data.TECHNICIAN);

    // 3. Admin can list users
    const listRes = await apiRequest('/api/users', { token: adminToken });
    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(listRes.data));
    assert.ok(listRes.data.length >= 2);

    // 4. Admin creates new user
    const testUsername = `user_test_${Date.now()}`;
    const createRes = await apiRequest('/api/users', {
      method: 'POST',
      token: adminToken,
      body: {
        username: testUsername,
        password: 'password123',
        name: 'Teknisi Baru Testing',
        role: 'TECHNICIAN',
      },
    });
    assert.equal(createRes.status, 201);
    const createdUser = createRes.data;
    assert.equal(createdUser.username, testUsername);
    assert.equal(createdUser.role, 'TECHNICIAN');

    // 5. Admin updates user
    const updateRes = await apiRequest(`/api/users/${createdUser.id}`, {
      method: 'PUT',
      token: adminToken,
      body: {
        name: 'Teknisi Senior Testing',
        role: 'STAFF',
      },
    });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.data.name, 'Teknisi Senior Testing');
    assert.equal(updateRes.data.role, 'STAFF');

    // 6. Admin toggles status
    const statusRes = await apiRequest(`/api/users/${createdUser.id}/status`, {
      method: 'PATCH',
      token: adminToken,
    });
    assert.equal(statusRes.status, 200);
    assert.equal(statusRes.data.isActive, false);

    // 7. Admin cannot deactivate own account
    const adminUser = listRes.data.find((u) => u.username === 'admin');
    const selfDeactivate = await apiRequest(`/api/users/${adminUser.id}/status`, {
      method: 'PATCH',
      token: adminToken,
    });
    assert.equal(selfDeactivate.status, 400);

    // 8. Admin deletes user
    const deleteRes = await apiRequest(`/api/users/${createdUser.id}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.equal(deleteRes.status, 200);
  });

  test('9. Dynamic custom role creation and access permissions (non-hardcoded)', async () => {
    // 1. Fetch available permissions
    const permsRes = await apiRequest('/api/roles/permissions', { token: adminToken });
    assert.equal(permsRes.status, 200);
    assert.ok(permsRes.data.length >= 10);

    // 2. Create custom role
    const customRoleName = `ROLE_QC_${Date.now()}`;
    const createRoleRes = await apiRequest('/api/roles', {
      method: 'POST',
      token: adminToken,
      body: {
        name: customRoleName,
        displayName: 'Quality Control Gerai',
        description: 'Pemeriksa kualitas baut dan kepatuhan standar teknis',
        permissionCodes: ['PICKLIST_GENERATE', 'SESSION_CHECKLIST', 'BOLTS_MANAGE'],
      },
    });
    assert.equal(createRoleRes.status, 201);
    const createdRole = createRoleRes.data;
    assert.equal(createdRole.name, customRoleName);
    assert.equal(createdRole.permissionCodes.length, 3);
    assert.ok(createdRole.permissionCodes.includes('BOLTS_MANAGE'));

    // 3. Update permissions of custom role
    const updateRoleRes = await apiRequest(`/api/roles/${createdRole.id}`, {
      method: 'PUT',
      token: adminToken,
      body: {
        displayName: 'Quality Control & Visual Inspector',
        permissionCodes: ['PICKLIST_GENERATE', 'SESSION_CHECKLIST', 'BOLTS_MANAGE', 'MEDIA_UPLOAD'],
      },
    });
    assert.equal(updateRoleRes.status, 200);
    assert.equal(updateRoleRes.data.permissionCodes.length, 4);
    assert.ok(updateRoleRes.data.permissionCodes.includes('MEDIA_UPLOAD'));

    // 4. Create user assigned to this dynamic role
    const customUserRes = await apiRequest('/api/users', {
      method: 'POST',
      token: adminToken,
      body: {
        username: `qc_staff_${Date.now()}`,
        password: 'password123',
        name: 'Staf QC Khusus',
        roleId: createdRole.id,
      },
    });
    assert.equal(customUserRes.status, 201);
    const customUser = customUserRes.data;
    assert.equal(customUser.roleId, createdRole.id);
    assert.equal(customUser.role, customRoleName);

    // 5. Deleting custom role while user assigned should fail
    const deleteRoleFail = await apiRequest(`/api/roles/${createdRole.id}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.equal(deleteRoleFail.status, 400);

    // 6. Delete user then delete custom role
    const deleteUserRes = await apiRequest(`/api/users/${customUser.id}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.equal(deleteUserRes.status, 200);

    const deleteRoleSuccess = await apiRequest(`/api/roles/${createdRole.id}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.equal(deleteRoleSuccess.status, 200);
  });

  test('10. Location map and position annotation CRUD (Phase A)', async () => {
    const { data: motorcycles } = await apiRequest('/api/motorcycles', { token: staffToken });
    const nmax = motorcycles.find((m) => m.displayName.includes('NMAX 155'));
    assert.ok(nmax);

    const mapRes = await apiRequest(`/api/motorcycles/${nmax.id}/location-map`, { token: staffToken });
    assert.equal(mapRes.status, 200);
    assert.equal(mapRes.data.motorcycle.id, nmax.id);
    assert.ok(Array.isArray(mapRes.data.positions));
    assert.ok(Array.isArray(mapRes.data.annotations));
    assert.ok(Array.isArray(mapRes.data.bolts));
    assert.ok(mapRes.data.bolts.length > 0);
    const posId = mapRes.data.positions[0]?.id || mapRes.data.allPositions[0]?.id;
    assert.ok(posId);

    // Staff cannot create annotation
    const staffDenied = await apiRequest('/api/position-annotations', {
      method: 'POST',
      token: staffToken,
      body: { boltPositionId: posId, motorcycleTypeId: nmax.id, x: 42.5, y: 63.0, label: 'Test' },
    });
    assert.equal(staffDenied.status, 403);

    // Nonexistent foreign keys return 400
    const badFk = await apiRequest('/api/position-annotations', {
      method: 'POST',
      token: adminToken,
      body: { boltPositionId: 999999, motorcycleTypeId: nmax.id, x: 10, y: 10 },
    });
    assert.equal(badFk.status, 400);

    // Admin creates annotation
    const created = await apiRequest('/api/position-annotations', {
      method: 'POST',
      token: adminToken,
      body: { boltPositionId: posId, motorcycleTypeId: nmax.id, x: 42.5, y: 63.0, label: 'Titik Test' },
    });
    assert.equal(created.status, 201);
    assert.equal(created.data.x, 42.5);
    assert.equal(created.data.y, 63.0);

    // Admin updates annotation
    const updated = await apiRequest(`/api/position-annotations/${created.data.id}`, {
      method: 'PUT',
      token: adminToken,
      body: { x: 50.0, y: 55.0, label: 'Titik Test Ubah' },
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.data.x, 50.0);
    assert.equal(updated.data.label, 'Titik Test Ubah');

    // Admin deletes annotation
    const deleted = await apiRequest(`/api/position-annotations/${created.data.id}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.equal(deleted.status, 200);
    assert.equal(deleted.data.success, true);
  });
});
