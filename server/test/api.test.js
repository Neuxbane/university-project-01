const { uploadsDir, cleanupUploads } = require('./setup');
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const path = require('path');
const app = require('../src/app');
const prisma = require('../src/db');
const { syncPermissionCatalog } = require('../src/utils/permissions');

let server;
let baseUrl;
let adminToken;
let staffToken;

before(async () => {
  await syncPermissionCatalog(prisma);
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
  cleanupUploads();
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

  test('4. POST /api/pick-lists/generate matches the catalog workbook (Honda Genio)', async () => {
    // Expected values come from the seed data: motor rows from docs/Hex_Ti_Spesifikasi_Baut.xlsx whose size
    // the shop sells, fitted with the catalog bolt of that size (Bighead, else Smallhead)
    const katalog = require('../prisma/data/hexti-katalog-baut.json');
    const { loadCatalogItems, pickCatalogItem } = require('../src/utils/catalog');
    const catalogItems = loadCatalogItems();
    const source = katalog.motorcycles.find((m) => m.model === 'Genio');
    const soldRows = source.requirements
      .map((r) => ({ ...r, item: pickCatalogItem(catalogItems, katalog.specs.find((sp) => sp.code === r.specCode)) }))
      .filter((r) => r.item);
    const { data: motorcycles } = await apiRequest('/api/motorcycles', { token: staffToken });
    const genio = motorcycles.find((m) => m.displayName === source.displayName);
    assert.ok(genio, `${source.displayName} should be in seeded data`);

    const { status, data } = await apiRequest('/api/pick-lists/generate', {
      method: 'POST',
      token: staffToken,
      body: { motorcycleTypeId: genio.id },
    });

    assert.equal(status, 200);
    assert.equal(data.motorcycle.id, genio.id);
    assert.ok(data.positionBreakdown.length > 0, 'Position breakdown should not be empty');

    // Total pcs must equal the workbook total of the sizes the shop sells
    const expectedTotal = soldRows.reduce((sum, r) => sum + r.quantity, 0);
    assert.equal(data.summary.totalQuantity, expectedTotal);
    // every fitted catalog bolt still needs its head variant confirmed
    assert.ok(data.consolidatedTotals.every((b) => b.needsCheck && b.name));

    // A catalog item used in more than one position must be summed across those positions
    const bySpec = {};
    for (const r of soldRows) {
      bySpec[r.item.code] = bySpec[r.item.code] || { qty: 0, positions: new Set() };
      bySpec[r.item.code].qty += r.quantity;
      bySpec[r.item.code].positions.add(r.position);
    }
    const [code, expected] = Object.entries(bySpec).find(([, v]) => v.positions.size > 1);
    const line = data.consolidatedTotals.find((item) => item.code === code);
    assert.ok(line, `${code} should be present in consolidated totals`);
    assert.equal(line.totalQuantity, expected.qty, `${code} should aggregate across positions`);
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
        buyerName: 'Pembeli Paket',
        items: [
          { boltSpecId: 1, quantity: 2, positionSummary: 'Kaliper Depan' },
        ],
      },
    });
    assert.equal(createRes.status, 201);
    const session = createRes.data;
    assert.equal(session.status, 'IN_PROGRESS');
    assert.equal(session.buyerName, 'Pembeli Paket');
    const renamed = await apiRequest(`/api/pick-lists/sessions/${session.id}`, { method: 'PATCH', token: staffToken, body: { buyerName: 'INV-0099' } });
    assert.equal(renamed.data.buyerName, 'INV-0099');

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

    // Completion time is recorded for the service-time report, cleared when an item is unticked
    const completed = await apiRequest(`/api/pick-lists/sessions/${session.id}`, { token: staffToken });
    assert.ok(completed.data.completedAt, 'completedAt is set once every item is checked');
    await apiRequest(`/api/pick-lists/sessions/${session.id}/items/${itemId}`, { method: 'PATCH', token: staffToken, body: { checked: false } });
    const reopened = await apiRequest(`/api/pick-lists/sessions/${session.id}`, { token: staffToken });
    assert.equal(reopened.data.status, 'IN_PROGRESS');
    assert.equal(reopened.data.completedAt, null);
    await apiRequest(`/api/pick-lists/sessions/${session.id}/items/${itemId}`, { method: 'PATCH', token: staffToken, body: { checked: true } });
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
    assert.equal(rbacRes.status, 403);

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
        permissionCodes: ['SESSION_CHECKLIST', 'BOLTS_MANAGE'],
      },
    });
    assert.equal(createRoleRes.status, 201);
    const createdRole = createRoleRes.data;
    assert.equal(createdRole.name, customRoleName);
    // each "kelola"/checklist feature brings the menu it needs
    assert.deepEqual([...createdRole.permissionCodes].sort(), ['BOLTS_MANAGE', 'MENU_MASTER_BARANG', 'MENU_RIWAYAT', 'SESSION_CHECKLIST']);

    // 3. Update permissions of custom role
    const updateRoleRes = await apiRequest(`/api/roles/${createdRole.id}`, {
      method: 'PUT',
      token: adminToken,
      body: {
        displayName: 'Quality Control & Visual Inspector',
        permissionCodes: ['SESSION_CHECKLIST', 'BOLTS_MANAGE', 'MENU_DASHBOARD', 'KODE_TIDAK_ADA'],
      },
    });
    assert.equal(updateRoleRes.status, 200);
    assert.equal(updateRoleRes.data.permissionCodes.length, 5);
    assert.ok(updateRoleRes.data.permissionCodes.includes('MENU_DASHBOARD'));
    assert.ok(!updateRoleRes.data.permissionCodes.includes('KODE_TIDAK_ADA'));

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

  test('10. Location map and position annotation CRUD (admin-marked, zero pre-seeded anchors)', async () => {
    const { data: motorcycles } = await apiRequest('/api/motorcycles', { token: staffToken });
    // Catalog NMAX (BBM1) from docs/Hex_Ti_Spesifikasi_Baut.xlsx has bolt data; legacy rows are empty
    const katalog = require('../prisma/data/hexti-katalog-baut.json');
    const bbm1Name = katalog.motorcycles.find((m) => m.catalogKey === 'BBM1').displayName;
    const nmax = motorcycles.find((m) => m.displayName === bbm1Name);
    assert.ok(nmax);

    const mapRes = await apiRequest(`/api/motorcycles/${nmax.id}/location-map`, { token: staffToken });
    assert.equal(mapRes.status, 200);
    assert.equal(mapRes.data.motorcycle.id, nmax.id);
    assert.ok(Array.isArray(mapRes.data.positions));
    assert.ok(Array.isArray(mapRes.data.annotations));
    assert.ok(Array.isArray(mapRes.data.bolts));
    assert.ok(mapRes.data.bolts.length > 0);

    // Create a fresh position dynamically via POST /api/positions
    const newPosRes = await apiRequest('/api/positions', {
      method: 'POST',
      token: adminToken,
      body: {
        name: `Area Anotasi Uji ${Date.now()}`,
        category: 'Area Kustom',
        notes: 'Untuk verifikasi anotasi admin',
      },
    });
    assert.equal(newPosRes.status, 201);
    const posId = newPosRes.data.id;

    // Staff cannot create annotation
    const staffDenied = await apiRequest('/api/position-annotations', {
      method: 'POST',
      token: staffToken,
      body: { boltPositionId: posId, motorcycleTypeId: nmax.id, x: 0.42, y: 0.29, z: -0.19, label: 'Test' },
    });
    assert.equal(staffDenied.status, 403);

    // Nonexistent foreign keys return 400
    const badFk = await apiRequest('/api/position-annotations', {
      method: 'POST',
      token: adminToken,
      body: { boltPositionId: 999999, motorcycleTypeId: nmax.id, x: 10, y: 10 },
    });
    assert.equal(badFk.status, 400);

    // Admin creates 3D annotation + bolt requirement atomically in one unified POST
    const specId = mapRes.data.bolts[0]?.boltSpecId;
    assert.ok(specId);
    const created = await apiRequest('/api/position-annotations', {
      method: 'POST',
      token: adminToken,
      body: {
        boltPositionId: posId,
        motorcycleTypeId: nmax.id,
        modelId: mapRes.data.model?.id || null,
        x: 0.42,
        y: 0.29,
        z: -0.19,
        normalX: 0,
        normalY: 0,
        normalZ: -1,
        label: 'Titik Test Admin',
        boltSpecId: specId,
        quantity: 3,
      },
    });
    assert.equal(created.status, 201);
    assert.equal(created.data.x, 0.42);
    assert.equal(created.data.y, 0.29);
    assert.equal(created.data.z, -0.19);
    assert.ok(created.data.createdRequirement);
    assert.equal(created.data.createdRequirement.quantity, 3);

    // Clean up unified created requirement after verification
    const reqDel = await apiRequest(`/api/requirements/${created.data.createdRequirement.id}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.equal(reqDel.status, 200);

    // Assert GET /api/motorcycles/:id/location-map returns the newly saved annotation
    const afterCreateMap = await apiRequest(`/api/motorcycles/${nmax.id}/location-map`, { token: staffToken });
    assert.equal(afterCreateMap.status, 200);
    assert.ok(afterCreateMap.data.annotations.some((a) => a.id === created.data.id));

    // Admin updates annotation
    const updated = await apiRequest(`/api/position-annotations/${created.data.id}`, {
      method: 'PUT',
      token: adminToken,
      body: { x: 0.5, y: 0.55, label: 'Titik Test Ubah' },
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.data.x, 0.5);
    assert.equal(updated.data.label, 'Titik Test Ubah');

    // Admin deletes annotation and asserts it is gone from location-map
    const deleted = await apiRequest(`/api/position-annotations/${created.data.id}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.equal(deleted.status, 200);
    assert.equal(deleted.data.success, true);

    const afterDeleteMap = await apiRequest(`/api/motorcycles/${nmax.id}/location-map`, { token: staffToken });
    assert.equal(afterDeleteMap.status, 200);
    assert.equal(afterDeleteMap.data.annotations.some((a) => a.id === created.data.id), false);

    // Clean up test position
    const delPosRes = await apiRequest(`/api/positions/${posId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.equal(delPosRes.status, 200);
  });

  test('11. 3D .glb model upload, transform update, and deletion CRUD (Phase D)', async () => {
    const { data: motorcycles } = await apiRequest('/api/motorcycles', { token: staffToken });
    const beat = motorcycles.find((m) => m.displayName.includes('Beat Deluxe'));
    assert.ok(beat);

    const sampleGlb = fs.readFileSync(path.join(__dirname, '../uploads/models/yamaha-nmax-155.glb'));
    assert.equal(sampleGlb.toString('utf8', 0, 4), 'glTF');

    // 1. Corrupt .glb should be rejected with HTTP 400
    const badForm = new FormData();
    badForm.append('model', new Blob([Buffer.from('not-a-glb-file')], { type: 'model/gltf-binary' }), 'bad.glb');
    const badRes = await fetch(`${baseUrl}/api/motorcycles/${beat.id}/model`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: badForm,
    });
    assert.equal(badRes.status, 400);

    // 2. Staff cannot upload 3D model
    const staffForm = new FormData();
    staffForm.append('model', new Blob([sampleGlb], { type: 'model/gltf-binary' }), 'test-beat.glb');
    const staffUpload = await fetch(`${baseUrl}/api/motorcycles/${beat.id}/model`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: staffForm,
    });
    assert.equal(staffUpload.status, 403);

    // 3. Admin uploads valid .glb
    const validForm = new FormData();
    validForm.append('model', new Blob([sampleGlb], { type: 'model/gltf-binary' }), 'test-beat.glb');
    validForm.append('scale', '1.2');
    validForm.append('rotationY', '1.57');
    const uploadRes = await fetch(`${baseUrl}/api/motorcycles/${beat.id}/model`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: validForm,
    });
    const uploadedModel = await uploadRes.json();
    assert.equal(uploadRes.status, 201);
    assert.ok(uploadedModel.modelUrl.startsWith('/uploads/models/'));
    assert.equal(uploadedModel.scale, 1.2);

    // 4. Uploaded .glb is statically served
    const glbGetRes = await fetch(`${baseUrl}${uploadedModel.modelUrl}`);
    assert.equal(glbGetRes.status, 200);

    // 5. Admin adjusts scale & rotationY via PATCH
    const patchRes = await apiRequest(`/api/motorcycles/${beat.id}/model`, {
      method: 'PATCH',
      token: adminToken,
      body: { scale: 1.5, rotationY: 0 },
    });
    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.data.scale, 1.5);
    assert.equal(patchRes.data.rotationY, 0);

    // 6. Admin deletes 3D model and motor reverts cleanly
    const delRes = await apiRequest(`/api/motorcycles/${beat.id}/model`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.equal(delRes.status, 200);
    assert.equal(delRes.data.success, true);

    const afterMap = await apiRequest(`/api/motorcycles/${beat.id}/location-map`, { token: staffToken });
    assert.equal(afterMap.status, 200);
    assert.equal(afterMap.data.model, null);
  });

  test('12. Close-up area photos and multi-bolt pin CRUD', async () => {
    const { data: motorcycles } = await apiRequest('/api/motorcycles', { token: staffToken });
    // Positions are scoped per motorcycle: use a catalog motorcycle and one of its own positions
    const katalog = require('../prisma/data/hexti-katalog-baut.json');
    const genioName = katalog.motorcycles.find((m) => m.model === 'Genio').displayName;
    const moto = motorcycles.find((m) => m.displayName === genioName);
    const { data: positions } = await apiRequest(`/api/positions?motorcycleTypeId=${moto.id}`, { token: staffToken });
    const { data: specs } = await apiRequest('/api/bolt-specs', { token: staffToken });
    assert.ok(moto && positions.length > 0 && specs.length >= 2);

    // 1. Staff denied creating close-up photo
    const staffDenied = await apiRequest(`/api/motorcycles/${moto.id}/closeups`, {
      method: 'POST',
      token: staffToken,
      body: { boltPositionId: positions[0].id, imageUrl: '/uploads/closeups/cvt-kiri-closeup.svg' },
    });
    assert.equal(staffDenied.status, 403);

    // 2. Admin creates close-up photo
    const createdPhoto = await apiRequest(`/api/motorcycles/${moto.id}/closeups`, {
      method: 'POST',
      token: adminToken,
      body: {
        boltPositionId: positions[0].id,
        imageUrl: '/uploads/closeups/cvt-kiri-closeup.svg',
        caption: 'Close-Up Test',
      },
    });
    assert.equal(createdPhoto.status, 201);
    assert.equal(createdPhoto.data.boltPositionId, positions[0].id);

    // 3. Admin adds two different bolt pins on that single close-up photo
    const pin1 = await apiRequest(`/api/closeups/${createdPhoto.data.id}/pins`, {
      method: 'POST',
      token: adminToken,
      body: { boltSpecId: specs[0].id, x: 25.5, y: 30.0, quantity: 4, label: 'Lubang Atas' },
    });
    const pin2 = await apiRequest(`/api/closeups/${createdPhoto.data.id}/pins`, {
      method: 'POST',
      token: adminToken,
      body: { boltSpecId: specs[1].id, x: 60.0, y: 55.0, quantity: 2, label: 'Lubang Tengah' },
    });
    assert.equal(pin1.status, 201);
    assert.equal(pin2.status, 201);

    // 4. Verify location-map returns closeUpPhotos with pins
    const mapRes = await apiRequest(`/api/motorcycles/${moto.id}/location-map`, { token: staffToken });
    assert.equal(mapRes.status, 200);
    const matchingCu = mapRes.data.closeUpPhotos.find((c) => c.id === createdPhoto.data.id);
    assert.ok(matchingCu);
    assert.equal(matchingCu.pins.length, 2);

    // 5. Update pin & delete pin & delete close-up photo
    const updatedPin = await apiRequest(`/api/closeup-pins/${pin1.data.id}`, {
      method: 'PUT',
      token: adminToken,
      body: { quantity: 6, label: 'Lubang Atas (Revisi)' },
    });
    assert.equal(updatedPin.status, 200);
    assert.equal(updatedPin.data.quantity, 6);

    const delPin = await apiRequest(`/api/closeup-pins/${pin1.data.id}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.equal(delPin.status, 200);

    const delPhoto = await apiRequest(`/api/closeups/${createdPhoto.data.id}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.equal(delPhoto.status, 200);
  });

  test('13. Custom area label creation (customAreaName) & position DELETE guard', async () => {
    const { data: motorcycles } = await apiRequest('/api/motorcycles', { token: staffToken });
    const beat = motorcycles.find((m) => m.displayName.includes('Beat Deluxe'));
    assert.ok(beat);

    const uniqueAreaName = `Spakbor Belakang Custom ${Date.now()}`;

    // 1. Admin creates close-up photo using customAreaName instead of boltPositionId
    const cu1 = await apiRequest(`/api/motorcycles/${beat.id}/closeups`, {
      method: 'POST',
      token: adminToken,
      body: {
        customAreaName: uniqueAreaName,
        customAreaCategory: 'Bodi Kustom',
        imageUrl: '/uploads/closeups/cvt-kiri-closeup.svg',
        caption: 'Area Label Sendiri',
      },
    });
    assert.equal(cu1.status, 201);
    assert.ok(cu1.data.boltPositionId);
    assert.equal(cu1.data.boltPosition.name, uniqueAreaName);
    assert.equal(cu1.data.boltPosition.category, 'Bodi Kustom');

    const createdPosId = cu1.data.boltPositionId;

    // 2. Posting with same area name in different casing reuses the existing BoltPosition
    const cu2 = await apiRequest(`/api/motorcycles/${beat.id}/closeups`, {
      method: 'POST',
      token: adminToken,
      body: {
        customAreaName: uniqueAreaName.toLowerCase(),
        imageUrl: '/uploads/closeups/cvt-kiri-closeup.svg',
      },
    });
    assert.equal(cu2.status, 201);
    assert.equal(cu2.data.boltPositionId, createdPosId);

    // 3. DELETE /api/positions/:id blocked (400) while referenced by close-up photos
    const blockedDel = await apiRequest(`/api/positions/${createdPosId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.equal(blockedDel.status, 400);

    // 4. Clean up close-up photos, then DELETE /api/positions/:id succeeds (200)
    await apiRequest(`/api/closeups/${cu1.data.id}`, { method: 'DELETE', token: adminToken });
    await apiRequest(`/api/closeups/${cu2.data.id}`, { method: 'DELETE', token: adminToken });

    const allowedDel = await apiRequest(`/api/positions/${createdPosId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.equal(allowedDel.status, 200);
  });

  test('14. Positions are scoped per motorcycle (same label, different bikes)', async () => {
    const { data: motorcycles } = await apiRequest('/api/motorcycles', { token: staffToken });
    const beat = motorcycles.find((m) => m.displayName.includes('Beat Deluxe'));
    const vario = motorcycles.find((m) => m.displayName.includes('Vario 125'));
    assert.ok(beat && vario);

    const sharedLabel = `Cover Kustom ${Date.now()}`;

    const beatPos = await apiRequest(`/api/motorcycles/${beat.id}/closeups`, {
      method: 'POST',
      token: adminToken,
      body: {
        customAreaName: sharedLabel,
        customAreaCategory: 'Bodi',
        imageUrl: '/uploads/closeups/cvt-kiri-closeup.svg',
      },
    });
    assert.equal(beatPos.status, 201);

    const varioPos = await apiRequest(`/api/motorcycles/${vario.id}/closeups`, {
      method: 'POST',
      token: adminToken,
      body: {
        customAreaName: sharedLabel,
        customAreaCategory: 'Bodi',
        imageUrl: '/uploads/closeups/cvt-kiri-closeup.svg',
      },
    });
    assert.equal(varioPos.status, 201);

    // Same label, but each motorcycle owns its own position row.
    assert.notEqual(beatPos.data.boltPositionId, varioPos.data.boltPositionId);

    // Scoped listing must not leak the other bike's label.
    const beatList = await apiRequest(`/api/positions?motorcycleTypeId=${beat.id}`, { token: staffToken });
    assert.equal(beatList.status, 200);
    assert.ok(beatList.data.some((p) => p.id === beatPos.data.boltPositionId));
    assert.ok(!beatList.data.some((p) => p.id === varioPos.data.boltPositionId));

    // Cleanup
    await apiRequest(`/api/closeups/${beatPos.data.id}`, { method: 'DELETE', token: adminToken });
    await apiRequest(`/api/closeups/${varioPos.data.id}`, { method: 'DELETE', token: adminToken });
    await apiRequest(`/api/positions/${beatPos.data.boltPositionId}`, { method: 'DELETE', token: adminToken });
    await apiRequest(`/api/positions/${varioPos.data.boltPositionId}`, { method: 'DELETE', token: adminToken });
  });

  test('15. Removing a motor-scoped custom area deletes bolts, pins, and cleans up orphaned BoltPosition', async () => {
    const { data: motorcycles } = await apiRequest('/api/motorcycles', { token: staffToken });
    const { data: specs } = await apiRequest('/api/bolt-specs', { token: staffToken });
    const beat = motorcycles.find((m) => m.displayName.includes('Beat Deluxe'));
    assert.ok(beat && specs.length > 0);

    const customName = `ad-area-${Date.now()}`;

    // 1. Create motor-owned custom area + 3D pin + bolt requirement atomically
    const created = await apiRequest('/api/position-annotations', {
      method: 'POST',
      token: adminToken,
      body: {
        customAreaName: customName,
        motorcycleTypeId: beat.id,
        x: 0.25,
        y: 0.4,
        z: -0.1,
        boltSpecId: specs[0].id,
        quantity: 2,
      },
    });
    assert.equal(created.status, 201);
    const posId = created.data.boltPositionId;
    const reqId = created.data.createdRequirement?.id;
    assert.ok(posId && reqId);

    // 2. Delete ONLY the bolt; motor-owned area stays visible in location-map.positions (no silent ghost)
    const delBolt = await apiRequest(`/api/requirements/${reqId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.equal(delBolt.status, 200);

    const mapAfterBoltDel = await apiRequest(`/api/motorcycles/${beat.id}/location-map`, { token: staffToken });
    assert.equal(mapAfterBoltDel.status, 200);
    assert.ok(mapAfterBoltDel.data.positions.some((p) => p.id === posId));

    // 3. Delete the area from the motorcycle via DELETE /api/motorcycles/:id/positions/:positionId
    const delArea = await apiRequest(`/api/motorcycles/${beat.id}/positions/${posId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.equal(delArea.status, 200);
    assert.equal(delArea.data.success, true);
    assert.equal(delArea.data.removedPositionRecord, true);
    assert.equal(delArea.data.deletedCounts.annotations, 1);

    // Verify area, pins, and orphaned BoltPosition record are all gone
    const afterAreaDelMap = await apiRequest(`/api/motorcycles/${beat.id}/location-map`, { token: staffToken });
    assert.equal(afterAreaDelMap.data.positions.some((p) => p.id === posId), false);
    assert.equal(afterAreaDelMap.data.annotations.some((a) => a.boltPositionId === posId), false);

    const allPos = await apiRequest('/api/positions', { token: staffToken });
    assert.equal(allPos.data.some((p) => p.id === posId), false);
  });

  test('16. Deactivated motorcycle can still be opened by Admin in location-map and reactivated', async () => {
    const { data: motorcycles } = await apiRequest('/api/motorcycles', { token: adminToken });
    const beat = motorcycles.find((m) => m.displayName.includes('Beat Deluxe'));
    assert.ok(beat);

    // Ensure Beat starts active even if a previous run interrupted midway
    if (!beat.isActive) {
      await apiRequest(`/api/motorcycles/${beat.id}/deactivate`, { method: 'PATCH', token: adminToken });
    }

    try {
      // 1. Admin deactivates Beat Deluxe
      const deact = await apiRequest(`/api/motorcycles/${beat.id}/deactivate`, {
        method: 'PATCH',
        token: adminToken,
      });
      assert.equal(deact.status, 200);
      assert.equal(deact.data.isActive, false);

      // 2. Non-admin staff still gets 404 on inactive motor location-map
      const staffMap = await apiRequest(`/api/motorcycles/${beat.id}/location-map`, { token: staffToken });
      assert.equal(staffMap.status, 404);

      // 3. Admin CAN load location-map for inactive motor so manage view & reactivate work cleanly
      const adminMap = await apiRequest(`/api/motorcycles/${beat.id}/location-map`, { token: adminToken });
      assert.equal(adminMap.status, 200);
      assert.equal(adminMap.data.motorcycle.isActive, false);

      // 4. Filter ?status=inactive finds it, and Admin reactivates it cleanly
      const inactiveList = await apiRequest('/api/motorcycles?status=inactive', { token: adminToken });
      assert.equal(inactiveList.status, 200);
      assert.ok(inactiveList.data.some((m) => m.id === beat.id));
    } finally {
      const reactivate = await apiRequest(`/api/motorcycles/${beat.id}/deactivate`, {
        method: 'PATCH',
        token: adminToken,
      });
      assert.equal(reactivate.status, 200);
      assert.equal(reactivate.data.isActive, true);
    }
  });

  test('17. OFF 3D model compatibility (copy-paste JSON & .off file serving)', async () => {
    const { data: motorcycles } = await apiRequest('/api/motorcycles', { token: adminToken });
    const beat = motorcycles.find((m) => m.displayName.includes('Beat Deluxe'));
    assert.ok(beat);

    // 1. Invalid OFF text should return HTTP 400
    const badOff = await apiRequest(`/api/motorcycles/${beat.id}/model`, {
      method: 'POST',
      token: adminToken,
      body: { offText: 'NOT_AN_OFF_HEADER\n1 1 0' },
    });
    assert.equal(badOff.status, 400);

    // 2. Valid copy-pasted OFF text creates a .off model cleanly
    const validOffText = [
      'OFF',
      '4 4 0',
      '0 0 0',
      '1 0 0',
      '0 1 0',
      '0 0 1',
      '3 0 1 2',
      '3 0 1 3',
      '3 1 2 3',
      '3 2 0 3',
    ].join('\n');

    const createdOff = await apiRequest(`/api/motorcycles/${beat.id}/model`, {
      method: 'POST',
      token: adminToken,
      body: { offText: validOffText, scale: 1.25 },
    });
    assert.equal(createdOff.status, 201);
    assert.ok(createdOff.data.modelUrl.endsWith('.off'));
    assert.equal(createdOff.data.scale, 1.25);

    // 3. Static serving of pasted .off file works
    const offRes = await fetch(`${baseUrl}${createdOff.data.modelUrl}`);
    assert.equal(offRes.status, 200);
    const bodyText = await offRes.text();
    assert.ok(bodyText.startsWith('OFF'));

    // 4. Clean up OFF model from Beat Deluxe
    const delOff = await apiRequest(`/api/motorcycles/${beat.id}/model`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.equal(delOff.status, 200);
  });

  test('18. Package full CRUD, status toggle, and bolt images inclusion', async () => {
    const [{ data: motorcycles }, { data: specs }] = await Promise.all([
      apiRequest('/api/motorcycles', { token: adminToken }),
      apiRequest('/api/bolt-specs', { token: adminToken }),
    ]);
    const vario = motorcycles.find((m) => m.displayName.includes('Vario 160'));
    assert.ok(vario && specs.length >= 2);

    // 1. Staff cannot create package (403)
    const staffCreate = await apiRequest('/api/packages', {
      method: 'POST',
      token: staffToken,
      body: {
        motorcycleTypeId: vario.id,
        packageType: 'Mesin',
        name: 'Forbidden Package',
        items: [{ boltSpecId: specs[0].id, quantity: 4 }],
      },
    });
    assert.equal(staffCreate.status, 403);

    // 2. Admin creates package (201) with full relations
    const created = await apiRequest('/api/packages', {
      method: 'POST',
      token: adminToken,
      body: {
        motorcycleTypeId: vario.id,
        packageType: 'Mesin',
        name: 'Paket Uji CRUD Vario 160',
        description: 'Paket mesin uji otomatis',
        items: [{ boltSpecId: specs[0].id, quantity: 6, emblemNote: 'Cover CVT' }],
      },
    });
    assert.equal(created.status, 201);
    assert.equal(created.data.status, 'ACTIVE');
    assert.equal(created.data.items.length, 1);
    assert.ok(Array.isArray(created.data.items[0].boltSpec.images));
    const pkgId = created.data.id;

    // 3. GET /api/packages includes motorcycleType & boltSpec.images
    const listRes = await apiRequest('/api/packages', { token: staffToken });
    assert.equal(listRes.status, 200);
    const found = listRes.data.find((p) => p.id === pkgId);
    assert.ok(found && found.motorcycleType?.displayName.includes('Vario 160'));
    assert.ok(Array.isArray(found.items[0].boltSpec.images));

    // 4. PUT updates metadata and replaces items atomically
    const updated = await apiRequest(`/api/packages/${pkgId}`, {
      method: 'PUT',
      token: adminToken,
      body: {
        motorcycleTypeId: vario.id,
        packageType: 'Pengereman',
        name: 'Paket Uji Pengereman Vario 160',
        description: 'Updated deskripsi',
        items: [
          { boltSpecId: specs[0].id, quantity: 4, emblemNote: 'Kaliper' },
          { boltSpecId: specs[1].id, quantity: 6, emblemNote: 'Disc Rotor' },
        ],
      },
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.data.packageType, 'Pengereman');
    assert.equal(updated.data.items.length, 2);

    // 5. PATCH status toggles ACTIVE -> INACTIVE and blocks pick-list generate
    const deactivated = await apiRequest(`/api/packages/${pkgId}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: {},
    });
    assert.equal(deactivated.status, 200);
    assert.equal(deactivated.data.status, 'INACTIVE');

    const pickInactive = await apiRequest('/api/pick-lists/generate', {
      method: 'POST',
      token: staffToken,
      body: { motorcycleTypeId: vario.id, packageId: pkgId },
    });
    assert.equal(pickInactive.status, 404);

    // 6. Toggle back ACTIVE -> DELETE removes cleanly
    const reactivated = await apiRequest(`/api/packages/${pkgId}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'ACTIVE' },
    });
    assert.equal(reactivated.status, 200);
    assert.equal(reactivated.data.status, 'ACTIVE');

    const deleted = await apiRequest(`/api/packages/${pkgId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.equal(deleted.status, 200);

    const afterDelete = await apiRequest(`/api/packages/${pkgId}`, { token: adminToken });
    assert.equal(afterDelete.status, 404);
  });

  test('19. Dashboard overview aggregates are consistent with the data', async () => {
    const anonymous = await apiRequest('/api/dashboard/overview');
    assert.equal(anonymous.status, 401);

    const [{ status, data }, { data: specs }] = await Promise.all([
      apiRequest('/api/dashboard/overview', { token: staffToken }),
      apiRequest('/api/bolt-specs', { token: staffToken }),
    ]);
    assert.equal(status, 200);
    const { totals } = data;
    const sum = (rows, key) => rows.reduce((acc, r) => acc + r[key], 0);

    assert.equal(totals.specs, specs.length);
    assert.ok(totals.totalPcs > 0);
    assert.equal(sum(data.pcsByMotorcycle, 'pcs'), totals.totalPcs, 'per-motorcycle pcs add up to the total');
    assert.equal(sum(data.pcsByCategory, 'pcs'), totals.totalPcs, 'per-area pcs add up to the total');
    assert.equal(sum(data.specsByDiameter, 'count'), specs.filter((s) => s.itemType === 'BAUT' && Number(s.diameterMm) > 0).length, 'sized bolts per diameter');
    assert.equal(sum(data.itemsByType, 'count'), totals.specs, 'every item counted once per type');
    const { productPhoto, illustrationOnly, none } = data.imageCoverage;
    assert.equal(productPhoto + illustrationOnly + none, totals.specs);
    assert.ok(data.topSpecs.length <= 10);
    data.topSpecs.slice(1).forEach((s, i) => assert.ok(s.pcs <= data.topSpecs[i].pcs, 'top sizes sorted by pcs'));
    assert.ok(Array.isArray(data.completeness.motorsWithoutData));
    assert.ok(data.completeness.rowsToCheck >= 0 && data.completeness.criticalRows >= 0);
  });

  test('20. Data verification, service-time report and pick-list safety flags', async () => {
    assert.equal((await apiRequest('/api/verification', { token: staffToken })).status, 403);
    assert.equal((await apiRequest('/api/service-time', { token: staffToken })).status, 403);

    // Catalog rows whose size was derived from the part code wait for a physical check
    const { status, data } = await apiRequest('/api/verification', { token: adminToken });
    assert.equal(status, 200);
    assert.ok(data.totalToCheck > 0);
    const row = data.groups[0].rows[0];
    const verified = await apiRequest('/api/verification', { method: 'PATCH', token: adminToken, body: { ids: [row.id], sizeStatus: 'VERIFIED' } });
    assert.equal(verified.status, 200);
    assert.equal(verified.data.updated, 1);
    assert.equal((await apiRequest('/api/verification', { token: adminToken })).data.totalToCheck, data.totalToCheck - 1);
    await apiRequest('/api/verification', { method: 'PATCH', token: adminToken, body: { ids: [row.id], sizeStatus: 'CEK_FISIK' } });
    assert.equal((await apiRequest('/api/verification', { method: 'PATCH', token: adminToken, body: { ids: [] } })).status, 400);

    // Pick list carries the flags per position and per size
    const checkLoc = await apiRequest(`/api/motorcycles/${data.groups[0].motorcycle.id}/location-map`, { token: staffToken });
    assert.ok(checkLoc.data.positionBreakdown.some((r) => r.sizeStatus === 'CEK_FISIK'));
    assert.ok(checkLoc.data.bolts.some((b) => b.needsCheck));
    const { data: motorcycles } = await apiRequest('/api/motorcycles', { token: staffToken });
    const genio = motorcycles.find((m) => m.model === 'Genio');
    const genioLoc = await apiRequest(`/api/motorcycles/${genio.id}/location-map`, { token: staffToken });
    assert.ok(genioLoc.data.positionBreakdown.some((r) => r.isCritical), 'brake/stand rows are critical');
    assert.ok(genioLoc.data.bolts.some((b) => b.isCritical));

    // Service time: baseline validated and stored; the session completed in test 6 is counted
    assert.equal((await apiRequest('/api/service-time/baseline', { method: 'PUT', token: adminToken, body: { minutes: 0 } })).status, 400);
    assert.equal((await apiRequest('/api/service-time/baseline', { method: 'PUT', token: adminToken, body: { minutes: 30 } })).status, 200);
    const report = await apiRequest('/api/service-time', { token: adminToken });
    assert.equal(report.status, 200);
    assert.equal(report.data.baselineMinutes, 30);
    assert.ok(report.data.summary.sessions >= 1);
    assert.notEqual(report.data.summary.improvementPercent, null);
  });

  test('21. Ubah Barang: name and size of a catalog item; a generated picture follows, a product photo stays', async () => {
    const { data: specs } = await apiRequest('/api/bolt-specs', { token: adminToken });
    const spec = specs.find((s) => s.name === 'M6x25 Bighead');
    assert.ok(spec, 'catalog item M6x25 Bighead exists');
    assert.ok(spec.images.some((img) => img.url === '/uploads/bolts/ukuran/M6x25.svg'), 'no catalog photo: shared size drawing');

    const body = { name: 'M6x26 Bighead Uji', diameterMm: 6, lengthMm: 26 };
    assert.equal((await apiRequest(`/api/bolt-specs/${spec.id}`, { method: 'PATCH', token: staffToken, body })).status, 403);
    assert.equal((await apiRequest(`/api/bolt-specs/${spec.id}`, { method: 'PATCH', token: adminToken, body: { ...body, name: ' ' } })).status, 400);
    // a name that already exists is refused instead of creating a duplicate
    assert.equal((await apiRequest(`/api/bolt-specs/${spec.id}`, { method: 'PATCH', token: adminToken, body: { ...body, name: 'm6x30  BIGHEAD' } })).status, 409);

    const changed = await apiRequest(`/api/bolt-specs/${spec.id}`, { method: 'PATCH', token: adminToken, body });
    assert.equal(changed.status, 200);
    assert.equal(changed.data.code, spec.code, 'catalog code stays');
    assert.equal(changed.data.name, 'M6x26 Bighead Uji');
    assert.equal(Number(changed.data.lengthMm), 26);
    assert.ok(changed.data.images.some((img) => img.url === '/uploads/bolts/ukuran/M6x26.svg'));
    assert.ok(fs.existsSync(path.join(uploadsDir, 'bolts/ukuran/M6x26.svg')));
    const restored = await apiRequest(`/api/bolt-specs/${spec.id}`, { method: 'PATCH', token: adminToken, body: { name: 'M6x25 Bighead', diameterMm: 6, lengthMm: 25 } });
    assert.ok(restored.data.images.some((img) => img.url === '/uploads/bolts/ukuran/M6x25.svg'));

    // a catalog product photo is kept when the item is renamed
    const withPhoto = specs.find((s) => s.name === 'M6x20 Bighead');
    const photo = withPhoto.images.find((img) => img.isPrimary).url;
    assert.match(photo, /^\/uploads\/bolts\/katalog\/HX-\d{3}\.jpg$/);
    const renamed = await apiRequest(`/api/bolt-specs/${withPhoto.id}`, { method: 'PATCH', token: adminToken, body: { name: 'M6x20 Bighead (uji)' } });
    assert.equal(renamed.data.images.find((img) => img.isPrimary).url, photo);
    await apiRequest(`/api/bolt-specs/${withPhoto.id}`, { method: 'PATCH', token: adminToken, body: { name: 'M6x20 Bighead' } });
  });

  test('22. Master Barang items and Bundling with price, bonus and buyer claim check', async () => {
    // Tambah Barang: an existing name is refused and pointed to; a new bolt and an emblem continue the catalog numbering
    const dup = await apiRequest('/api/bolt-specs/items', { method: 'POST', token: adminToken, body: { itemType: 'BAUT', name: ' m6x20   BIGHEAD ' } });
    assert.equal(dup.status, 409);
    assert.match(dup.data.code, /^HX-\d{3}$/);
    assert.equal((await apiRequest('/api/bolt-specs/items', { method: 'POST', token: staffToken, body: { itemType: 'BAUT', name: 'M6x99 Bighead Uji', diameterMm: 6, lengthMm: 99 } })).status, 403);
    assert.equal((await apiRequest('/api/bolt-specs/items', { method: 'POST', token: adminToken, body: { itemType: 'BARANG', name: 'Tanpa jenis' } })).status, 400);
    const bolt = await apiRequest('/api/bolt-specs/items', { method: 'POST', token: adminToken, body: { itemType: 'BAUT', name: 'M6x99 Bighead Uji', diameterMm: 6, lengthMm: 99 } });
    assert.equal(bolt.status, 201);
    assert.ok(bolt.data.catalogNo > 416, 'new items continue after the 416 catalog rows');
    assert.equal(bolt.data.code, `HX-${bolt.data.catalogNo}`);
    assert.ok(bolt.data.images.some((img) => img.url === '/uploads/bolts/ukuran/M6x99.svg'));
    const emblem = await apiRequest('/api/bolt-specs/items', { method: 'POST', token: adminToken, body: { itemType: 'EMBLEM', name: 'Emblem Uji Titanium', diameterMm: 6 } });
    assert.equal(emblem.status, 201);
    assert.equal(emblem.data.itemType, 'EMBLEM');
    assert.equal(Number(emblem.data.diameterMm), 0, 'only bolts, nuts and rings carry a size');
    assert.equal(emblem.data.images[0].url, `/uploads/bolts/katalog/${emblem.data.code}.svg`);
    assert.ok(fs.existsSync(path.join(uploadsDir, `bolts/katalog/${emblem.data.code}.svg`)));
    const boltsOnly = await apiRequest('/api/bolt-specs?itemType=BAUT', { token: adminToken });
    assert.ok(boltsOnly.data.every((s) => s.itemType === 'BAUT'));
    const fitted = await apiRequest('/api/bolt-specs?itemType=MUR,RING', { token: adminToken });
    assert.ok(fitted.data.length > 0 && fitted.data.every((s) => s.itemType === 'MUR' || s.itemType === 'RING'));

    // Bundling without a motorcycle: two bolts plus a bonus emblem, with a price
    const created = await apiRequest('/api/packages', {
      method: 'POST',
      token: adminToken,
      body: {
        packageType: 'Bundling Lainnya',
        name: 'Bundling Uji Baut + Emblem',
        price: 250000,
        items: [
          { boltSpecId: bolt.data.id, quantity: 4 },
          { boltSpecId: dup.data.existingId, quantity: 2 },
          { boltSpecId: emblem.data.id, quantity: 1, isBonus: true },
        ],
      },
    });
    assert.equal(created.status, 201);
    assert.equal(created.data.motorcycleTypeId, null);
    assert.equal(created.data.price, 250000);
    assert.equal(created.data.items.filter((i) => i.isBonus).length, 1);

    // Buyer claim: staff starts it, ticks every item, the claim completes
    const claim = await apiRequest(`/api/packages/${created.data.id}/claims`, { method: 'POST', token: staffToken, body: { buyerName: 'Pembeli Uji' } });
    assert.equal(claim.status, 201);
    assert.equal(claim.data.items.length, 3);
    let latest = claim.data;
    for (const item of claim.data.items) {
      latest = (await apiRequest(`/api/bundle-claims/${claim.data.id}/items/${item.id}`, { method: 'PATCH', token: staffToken, body: { claimed: true } })).data;
    }
    assert.ok(latest.completedAt, 'claim completes when every item is claimed');
    // a partial claim stays open in Riwayat
    const unticked = await apiRequest(`/api/bundle-claims/${claim.data.id}/items/${claim.data.items[0].id}`, { method: 'PATCH', token: staffToken, body: { claimed: false } });
    assert.equal(unticked.data.completedAt, null);
    const claims = await apiRequest(`/api/packages/${created.data.id}/claims`, { token: staffToken });
    assert.equal(claims.data.length, 1);
    const named = await apiRequest(`/api/bundle-claims/${claim.data.id}`, { method: 'PATCH', token: staffToken, body: { buyerName: 'Pembeli Ganti' } });
    assert.equal(named.data.buyerName, 'Pembeli Ganti');
    const riwayat = await apiRequest('/api/bundle-claims', { token: staffToken });
    const open = riwayat.data.find((c) => c.id === claim.data.id);
    assert.ok(open && !open.completedAt && open.package.name === 'Bundling Uji Baut + Emblem');

    // A motorcycle bundling keeps emblems out of the installation pick list
    const { data: motorcycles } = await apiRequest('/api/motorcycles', { token: adminToken });
    const genio = motorcycles.find((m) => m.model === 'Genio');
    const genioBundle = await apiRequest('/api/packages', {
      method: 'POST',
      token: adminToken,
      body: { motorcycleTypeId: genio.id, packageType: 'Bundling Lainnya', name: 'Bundling Uji Genio', items: [{ boltSpecId: dup.data.existingId, quantity: 2 }, { boltSpecId: emblem.data.id, quantity: 1, isBonus: true }] },
    });
    const pick = await apiRequest('/api/pick-lists/generate', { method: 'POST', token: staffToken, body: { motorcycleTypeId: genio.id, packageId: genioBundle.data.id } });
    assert.equal(pick.status, 200);
    assert.ok(pick.data.consolidatedTotals.length > 0);
    assert.ok(pick.data.consolidatedTotals.every((b) => ['BAUT', 'MUR', 'RING'].includes(b.boltSpec.itemType)));
  });

  test('23. Kelola Data photo upload: the newest uploaded photo becomes the main motor photo', async () => {
    const { data: motorcycles } = await apiRequest('/api/motorcycles', { token: adminToken });
    const motor = motorcycles.find((m) => m.model === 'Scoopy');
    const upload = async (name) => {
      const form = new FormData();
      form.append('images', new Blob([Buffer.from('fake-jpeg-bytes')], { type: 'image/jpeg' }), name);
      const res = await fetch(`${baseUrl}/api/motorcycles/${motor.id}/images`, { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` }, body: form });
      return { status: res.status, data: await res.json() };
    };
    const first = await upload('foto-lama.jpg');
    assert.equal(first.status, 201);
    const second = await upload('foto-baru.jpg');
    assert.equal(second.status, 201);
    const { data } = await apiRequest(`/api/motorcycles/${motor.id}`, { token: adminToken });
    const primary = data.images.filter((img) => img.isPrimary);
    assert.equal(primary.length, 1, 'exactly one main photo');
    assert.ok(primary[0].url.endsWith('foto-baru.jpg'), 'the newest upload is the main photo');
    const { data: roster } = await apiRequest('/api/motorcycles', { token: staffToken });
    assert.ok(roster.find((m) => m.id === motor.id).images[0].url.endsWith('foto-baru.jpg'), 'roster card shows the new photo');
  });

  test('24. Edit Profil Paket: admin edits the motorcycle profile, staff cannot', async () => {
    const { data: motorcycles } = await apiRequest('/api/motorcycles', { token: adminToken });
    const motor = motorcycles.find((m) => m.model === 'Vario' && m.variant.includes('125'));
    const other = motorcycles.find((m) => m.model === 'Genio');
    const body = { brand: motor.brand, model: motor.model, variant: motor.variant, yearStart: motor.yearStart, yearEnd: motor.yearEnd, notes: 'Catatan uji' };

    assert.equal((await apiRequest(`/api/motorcycles/${motor.id}`, { method: 'PUT', token: staffToken, body })).status, 403);
    assert.equal((await apiRequest(`/api/motorcycles/${motor.id}`, { method: 'PUT', token: adminToken, body: { ...body, model: '' } })).status, 400);
    assert.equal((await apiRequest(`/api/motorcycles/${motor.id}`, { method: 'PUT', token: adminToken, body: { ...body, yearStart: 2020, yearEnd: 2010 } })).status, 400);
    const dup = await apiRequest(`/api/motorcycles/${motor.id}`, {
      method: 'PUT', token: adminToken,
      body: { brand: other.brand, model: other.model, variant: other.variant, yearStart: other.yearStart, yearEnd: other.yearEnd },
    });
    assert.equal(dup.status, 409);

    const custom = await apiRequest(`/api/motorcycles/${motor.id}`, { method: 'PUT', token: adminToken, body: { ...body, displayName: 'Honda Vario 125 (profil uji)' } });
    assert.equal(custom.status, 200);
    assert.equal(custom.data.displayName, 'Honda Vario 125 (profil uji)');
    assert.equal(custom.data.notes, 'Catatan uji');
    const auto = await apiRequest(`/api/motorcycles/${motor.id}`, { method: 'PUT', token: adminToken, body });
    assert.equal(auto.data.displayName, `${motor.brand} ${motor.model} ${motor.variant} (${motor.yearStart}${motor.yearEnd ? `-${motor.yearEnd}` : ''})`);
  });

  test('25. Fitur per peran: super admin decides what each role can open and change', async () => {
    const login = async (username, password) => (await apiRequest('/api/auth/login', { method: 'POST', body: { username, password } })).data;
    const stamp = Date.now();

    // catalog: menus and features, retired codes gone, dependencies exposed
    const perms = (await apiRequest('/api/roles/permissions', { token: adminToken })).data;
    const codes = perms.map((p) => p.code);
    for (const c of ['MENU_DASHBOARD', 'MENU_PAKET_FULL_BIKE', 'MENU_BUNDLING', 'MENU_RIWAYAT', 'SESSION_CHECKLIST', 'MOTORCYCLES_MANAGE', 'VERIFICATION_MANAGE']) assert.ok(codes.includes(c), c);
    assert.ok(!codes.includes('PICKLIST_GENERATE') && !codes.includes('MEDIA_UPLOAD'));
    assert.deepEqual(perms.find((p) => p.code === 'MOTORCYCLES_MANAGE').requires, ['MENU_PAKET_FULL_BIKE']);

    // the client gets the feature list on login and from /me
    const staff = await login('staff', 'staff123');
    assert.ok(staff.user.permissionCodes.includes('MENU_PAKET_FULL_BIKE') && staff.user.permissionCodes.includes('SESSION_CHECKLIST'));
    assert.ok(!staff.user.permissionCodes.includes('MOTORCYCLES_MANAGE'));
    assert.deepEqual((await login('admin', 'admin123')).user.permissionCodes, ['*']);
    assert.deepEqual((await apiRequest('/api/auth/me', { token: staff.token })).data.user.permissionCodes.sort(), [...staff.user.permissionCodes].sort());

    // a role that may only look at Paket Full Bike
    const role = (await apiRequest('/api/roles', { method: 'POST', token: adminToken, body: { name: `LIHAT_${stamp}`, displayName: 'Hanya Lihat', permissionCodes: ['MENU_PAKET_FULL_BIKE'] } })).data;
    const user = (await apiRequest('/api/users', { method: 'POST', token: adminToken, body: { username: `lihat_${stamp}`, password: 'lihat123', name: 'Uji Lihat', roleId: role.id } })).data;
    const viewer = await login(`lihat_${stamp}`, 'lihat123');
    const { data: motorcycles } = await apiRequest('/api/motorcycles', { token: adminToken });
    const motor = motorcycles.find((m) => m.model === 'Genio');
    const body = { brand: motor.brand, model: motor.model, variant: motor.variant, yearStart: motor.yearStart, yearEnd: motor.yearEnd, displayName: motor.displayName, notes: motor.notes };

    assert.equal((await apiRequest(`/api/motorcycles/${motor.id}/location-map`, { token: viewer.token })).status, 200);
    assert.equal((await apiRequest('/api/pick-lists/sessions', { method: 'POST', token: viewer.token, body: { motorcycleTypeId: motor.id, items: [] } })).status, 403);
    assert.equal((await apiRequest(`/api/motorcycles/${motor.id}`, { method: 'PUT', token: viewer.token, body })).status, 403);
    assert.equal((await apiRequest('/api/verification', { token: viewer.token })).status, 403);

    // Hidden menus are also closed at the API, including direct URLs.
    for (const endpoint of ['/api/dashboard/overview', '/api/bolt-specs', '/api/packages', '/api/pick-lists/sessions', '/api/bundle-claims', '/api/roles', '/api/users/rbac-matrix']) {
      assert.equal((await apiRequest(endpoint, { token: viewer.token })).status, 403, endpoint);
    }

    // super admin opens Kelola Data + Verifikasi for the role: same token works right away
    const opened = await apiRequest(`/api/roles/${role.id}`, { method: 'PUT', token: adminToken, body: { permissionCodes: ['MOTORCYCLES_MANAGE', 'VERIFICATION_MANAGE'] } });
    assert.deepEqual([...opened.data.permissionCodes].sort(), ['MENU_PAKET_FULL_BIKE', 'MOTORCYCLES_MANAGE', 'VERIFICATION_MANAGE']);
    assert.equal((await apiRequest(`/api/motorcycles/${motor.id}`, { method: 'PUT', token: viewer.token, body })).status, 200);
    assert.equal((await apiRequest('/api/verification', { token: viewer.token })).status, 200);
    assert.equal((await apiRequest('/api/bolt-specs/items', { method: 'POST', token: viewer.token, body: { itemType: 'EMBLEM', name: 'Uji' } })).status, 403);

    // account managers that are not super admin cannot touch super admin accounts or the super admin role
    await apiRequest(`/api/roles/${role.id}`, { method: 'PUT', token: adminToken, body: { permissionCodes: ['USERS_MANAGE', 'ROLES_MANAGE'] } });
    const roles = (await apiRequest('/api/roles', { token: adminToken })).data;
    const adminRole = roles.find((r) => r.name === 'ADMIN');
    const adminUser = (await apiRequest('/api/users', { token: adminToken })).data.find((u) => u.username === 'admin');
    assert.equal((await apiRequest('/api/users', { method: 'POST', token: viewer.token, body: { username: `boss_${stamp}`, password: 'boss1234', name: 'Boss', roleId: adminRole.id } })).status, 403);
    assert.equal((await apiRequest(`/api/users/${adminUser.id}`, { method: 'PUT', token: viewer.token, body: { name: 'Diubah' } })).status, 403);
    assert.equal((await apiRequest(`/api/users/${user.id}`, { method: 'PUT', token: viewer.token, body: { roleId: adminRole.id } })).status, 403);
    assert.equal((await apiRequest(`/api/roles/${adminRole.id}`, { method: 'PUT', token: viewer.token, body: { permissionCodes: [] } })).status, 403);
    // the super admin role always keeps every feature
    await apiRequest(`/api/roles/${adminRole.id}`, { method: 'PUT', token: adminToken, body: { permissionCodes: [] } });
    assert.equal((await apiRequest('/api/verification', { token: adminToken })).status, 200);

    // Closing every feature takes effect for the existing token and survives server catalog sync.
    await apiRequest(`/api/roles/${role.id}`, { method: 'PUT', token: adminToken, body: { permissionCodes: [] } });
    await syncPermissionCatalog(prisma);
    assert.deepEqual((await apiRequest('/api/auth/me', { token: viewer.token })).data.user.permissionCodes, []);
    assert.equal((await apiRequest('/api/motorcycles', { token: viewer.token })).status, 403);
    assert.equal((await apiRequest(`/api/motorcycles/${motor.id}/location-map`, { token: viewer.token })).status, 403);

    assert.equal((await apiRequest(`/api/users/${user.id}`, { method: 'DELETE', token: adminToken })).status, 200);
    assert.equal((await apiRequest(`/api/roles/${role.id}`, { method: 'DELETE', token: adminToken })).status, 200);
  });

  test('26. Checklist rejects an item from another session without changing either session', async () => {
    const motor = await prisma.motorcycleType.findFirst({ where: { isActive: true } });
    const spec = await prisma.boltSpec.findFirst();
    const body = { motorcycleTypeId: motor.id, items: [{ boltSpecId: spec.id, quantity: 1, checked: false }] };
    const a = (await apiRequest('/api/pick-lists/sessions', { method: 'POST', token: staffToken, body })).data;
    const b = (await apiRequest('/api/pick-lists/sessions', { method: 'POST', token: staffToken, body })).data;
    try {
      const mismatch = await apiRequest(`/api/pick-lists/sessions/${a.id}/items/${b.items[0].id}`, { method: 'PATCH', token: staffToken, body: { checked: true } });
      assert.equal(mismatch.status, 404);
      for (const session of [a, b]) {
        const detail = (await apiRequest(`/api/pick-lists/sessions/${session.id}`, { token: staffToken })).data;
        assert.equal(detail.items[0].checked, false);
        assert.equal(detail.status, 'IN_PROGRESS');
      }
    } finally {
      await prisma.pickSession.deleteMany({ where: { id: { in: [a.id, b.id] } } });
    }
  });

  test('27. Importing integration tests without a dedicated test database fails before app startup', () => {
    const { spawnSync } = require('node:child_process');
    for (const testUrl of ['', 'postgresql://unused:unused@localhost:5433/hextitanium_db']) {
      const result = spawnSync(process.execPath, ['-e', "require('./test/api.test.js')"], {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, TEST_DATABASE_URL: testUrl },
        encoding: 'utf8',
      });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Tes diblokir/);
    }
    assert.notEqual(path.resolve(uploadsDir), path.resolve(__dirname, '../uploads'));
  });

  test('26. Master Barang is the shop catalog: names, photos, generated pictures and dashboard totals', async () => {
    const { items } = require('../prisma/data/hexti-katalog-produk.json');
    const { data: specs } = await apiRequest('/api/bolt-specs', { token: staffToken });
    const catalog = specs.filter((s) => s.catalogNo && s.catalogNo <= 416);
    assert.equal(catalog.length, items.length);
    for (const item of items) {
      const spec = catalog.find((s) => s.code === item.code);
      assert.ok(spec, `${item.code} ${item.name}`);
      assert.equal(spec.name, item.name);
      assert.equal(spec.itemType, item.itemType);
      const primary = spec.images.find((img) => img.isPrimary);
      assert.ok(primary, `${item.code} has a picture`);
      if (item.photo) assert.equal(primary.url, item.photo);
    }
    const kinds = new Set(catalog.map((s) => s.itemType));
    for (const t of ['BAUT', 'MUR', 'RING', 'EMBLEM', 'PART', 'PERAWATAN', 'JASA']) assert.ok(kinds.has(t), t);
    // no photo: bolts reuse the size drawing, other goods get their own illustration
    const plainBolt = catalog.find((s) => s.name === 'M8x15 Bighead');
    assert.equal(plainBolt.images[0].url, '/uploads/bolts/ukuran/M8x15.svg');
    const service = catalog.find((s) => s.itemType === 'JASA');
    assert.equal(service.images[0].url, `/uploads/bolts/katalog/${service.code}.svg`);
    // the seed writes its pictures to its own upload folder, so check the drawing itself here
    const { buildCatalogSvg } = require('../src/utils/catalogIllustration');
    const svg = buildCatalogSvg(service);
    assert.match(svg, /^<svg[^>]+viewBox="0 0 640 400"/);
    assert.ok(svg.includes(service.name.split(' ')[0]) && svg.includes('Jasa'));

    const { data: overview } = await apiRequest('/api/dashboard/overview', { token: staffToken });
    assert.ok(overview.totals.specs >= items.length);
    assert.equal(overview.itemsByType.reduce((sum, t) => sum + t.count, 0), overview.totals.specs);
    assert.ok(overview.imageCoverage.productPhoto >= items.filter((i) => i.photo).length);
  });
});
