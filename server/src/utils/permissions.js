// Features a role can see and use. The super admin (user role ADMIN) always gets everything;
// every other role gets exactly what is ticked in Kelola Sistem > Kelola Peran & Hak Akses.
// - defaultRoles: granted once, when the code first appears in a database (fresh seed or upgrade)
// - requires: switched on together with this code (a "kelola" feature needs its menu)
const STAFF_ROLES = ['STAFF', 'TECHNICIAN'];

const PERMISSION_CATALOG = [
  // Menu: what a role can open
  { code: 'MENU_DASHBOARD', name: 'Dashboard', category: 'Menu', description: 'Ringkasan isi sistem dan diagram', defaultRoles: STAFF_ROLES },
  { code: 'MENU_MASTER_BARANG', name: 'Master Barang (lihat)', category: 'Menu', description: 'Daftar baut, mur, dan emblem beserta fotonya', defaultRoles: STAFF_ROLES },
  { code: 'MENU_PAKET_FULL_BIKE', name: 'Paket Full Bike & Panduan Pasang', category: 'Menu', description: 'Daftar motor, isi paket per rak/posisi, model 3D, dan panduan pasang', defaultRoles: STAFF_ROLES },
  { code: 'MENU_BUNDLING', name: 'Bundling (lihat isi)', category: 'Menu', description: 'Daftar bundling beserta isinya', defaultRoles: STAFF_ROLES },
  { code: 'MENU_RIWAYAT', name: 'Riwayat', category: 'Menu', description: 'Daftar checklist Paket Full Bike dan Bundling', defaultRoles: STAFF_ROLES },
  { code: 'MENU_BUKU_PANDUAN', name: 'Buku Panduan', category: 'Menu', description: 'Petunjuk pemakaian aplikasi', defaultRoles: STAFF_ROLES },
  { code: 'VERIFICATION_MANAGE', name: 'Verifikasi Full Bike', category: 'Menu', description: 'Tandai baut kritis dan ukuran yang perlu cek fisik' },
  { code: 'REPORT_SERVICE_TIME', name: 'Laporan Waktu Layanan', category: 'Menu', description: 'Lama pengerjaan checklist dan target waktunya' },

  // Operasional
  { code: 'SESSION_CHECKLIST', name: 'Mulai & centang checklist', category: 'Operasional', description: 'Tombol Mulai Checklist, mencentang barang, dan mengisi nama pembeli di Riwayat', requires: ['MENU_RIWAYAT'], defaultRoles: STAFF_ROLES },

  // Kelola data: changing master data
  { code: 'BOLTS_MANAGE', name: 'Kelola Master Barang', category: 'Kelola Data', description: 'Tambah barang, ubah ukuran, dan kelola foto barang', requires: ['MENU_MASTER_BARANG'] },
  { code: 'MOTORCYCLES_MANAGE', name: 'Kelola Data Paket Full Bike', category: 'Kelola Data', description: 'Tambah motor, Edit Profil Paket, Kelola Data baut, foto & model 3D, mode anotasi, atur posisi', requires: ['MENU_PAKET_FULL_BIKE'] },
  { code: 'PACKAGES_MANAGE', name: 'Kelola Bundling', category: 'Kelola Data', description: 'Buat, ubah, nonaktifkan, dan hapus bundling', requires: ['MENU_BUNDLING'] },

  // Kelola Sistem
  { code: 'USERS_MANAGE', name: 'Kelola akun pengguna', category: 'Kelola Sistem', description: 'Buat akun, ganti password, aktif/nonaktifkan pengguna' },
  { code: 'ROLES_MANAGE', name: 'Kelola peran & hak akses', category: 'Kelola Sistem', description: 'Atur fitur yang tampil untuk tiap peran' },
  { code: 'CSV_IMPORT_EXPORT', name: 'Impor data (CSV)', category: 'Kelola Sistem', description: 'Impor kebutuhan baut per motor dari file CSV' },
  { code: 'SYSTEM_BACKUP_RESTORE', name: 'Cadangan & pulihkan', category: 'Kelola Sistem', description: 'Unduh cadangan data dan pulihkan database' },
  { code: 'AUDIT_LOG_VIEW', name: 'Catatan aktivitas', category: 'Kelola Sistem', description: 'Lihat jejak aktivitas semua pengguna' },
];

const CATALOG_BY_CODE = new Map(PERMISSION_CATALOG.map((p) => [p.code, p]));
const CATALOG_ORDER = new Map(PERMISSION_CATALOG.map((p, i) => [p.code, i]));

// Known codes only, plus whatever they require
function normalizePermissionCodes(codes) {
  const result = new Set();
  for (const code of Array.isArray(codes) ? codes : []) {
    const entry = CATALOG_BY_CODE.get(code);
    if (!entry) continue;
    result.add(code);
    for (const req of entry.requires || []) result.add(req);
  }
  return [...result].sort((a, b) => CATALOG_ORDER.get(a) - CATALOG_ORDER.get(b));
}

const sortByCatalog = (permissions) => [...permissions]
  .sort((a, b) => (CATALOG_ORDER.get(a.code) ?? 999) - (CATALOG_ORDER.get(b.code) ?? 999))
  .map((p) => ({ ...p, requires: CATALOG_BY_CODE.get(p.code)?.requires || [] }));

// Bring the permissions table in line with the catalog (runs on every server start; idempotent):
// new codes are created and given to their default roles, names/descriptions follow the catalog,
// retired codes are removed, and every role keeps the menus its "kelola" features need.
async function syncPermissionCatalog(prisma) {
  return prisma.$transaction((tx) => syncCatalog(tx), { timeout: 30000 });
}

async function syncCatalog(prisma) {
  const existing = new Set((await prisma.permission.findMany({ select: { code: true } })).map((p) => p.code));
  const idByCode = {};

  for (const p of PERMISSION_CATALOG) {
    const data = { name: p.name, category: p.category, description: p.description };
    const record = await prisma.permission.upsert({ where: { code: p.code }, update: data, create: { code: p.code, ...data } });
    idByCode[p.code] = record.id;

    if (!existing.has(p.code) && p.defaultRoles?.length) {
      const roles = await prisma.role.findMany({ where: { name: { in: p.defaultRoles } }, select: { id: true } });
      for (const r of roles) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: r.id, permissionId: record.id } },
          update: {},
          create: { roleId: r.id, permissionId: record.id },
        });
      }
    }
  }

  // Preserve the ability to view Full Bike for custom roles using the retired pick-list code.
  const legacyRoles = await prisma.role.findMany({
    where: { permissions: { some: { permission: { code: 'PICKLIST_GENERATE' } } } },
    select: { id: true },
  });
  for (const role of legacyRoles) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: idByCode.MENU_PAKET_FULL_BIKE } },
      update: {}, create: { roleId: role.id, permissionId: idByCode.MENU_PAKET_FULL_BIKE },
    });
  }
  await prisma.permission.deleteMany({ where: { code: { notIn: PERMISSION_CATALOG.map((p) => p.code) } } });

  const roles = await prisma.role.findMany({ select: { id: true, permissions: { select: { permission: { select: { code: true } } } } } });
  for (const r of roles) {
    const codes = r.permissions.map((rp) => rp.permission.code);
    const missing = normalizePermissionCodes(codes).filter((c) => !codes.includes(c));
    if (missing.length) {
      await prisma.rolePermission.createMany({ data: missing.map((c) => ({ roleId: r.id, permissionId: idByCode[c] })), skipDuplicates: true });
    }
  }
}

module.exports = {
  PERMISSION_CATALOG,
  normalizePermissionCodes,
  sortByCatalog,
  syncPermissionCatalog,
};
