const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const path = require('path');
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

  test('10. Location map and position annotation CRUD (admin-marked, zero pre-seeded anchors)', async () => {
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
    const beat = motorcycles.find((m) => m.displayName.includes('Beat Deluxe'));
    const { data: positions } = await apiRequest('/api/positions', { token: staffToken });
    const { data: specs } = await apiRequest('/api/bolt-specs', { token: staffToken });
    assert.ok(beat && positions.length > 0 && specs.length >= 2);

    // 1. Staff denied creating close-up photo
    const staffDenied = await apiRequest(`/api/motorcycles/${beat.id}/closeups`, {
      method: 'POST',
      token: staffToken,
      body: { boltPositionId: positions[0].id, imageUrl: '/uploads/closeups/cvt-kiri-closeup.svg' },
    });
    assert.equal(staffDenied.status, 403);

    // 2. Admin creates close-up photo
    const createdPhoto = await apiRequest(`/api/motorcycles/${beat.id}/closeups`, {
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
    const mapRes = await apiRequest(`/api/motorcycles/${beat.id}/location-map`, { token: staffToken });
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
});
