const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Hex Titanium Database Seeding...');

  // 1. Seed Dynamic Permissions
  const permissionsData = [
    { code: 'USERS_MANAGE', name: 'Manajemen Pengguna & Password', category: 'Pengguna', description: 'Membuat akun, reset password, dan mengubah status pengguna' },
    { code: 'ROLES_MANAGE', name: 'Manajemen Peran & Hak Akses (RBAC)', category: 'Pengguna', description: 'Membuat peran kustom dan mengatur izin aksesnya' },
    { code: 'MOTORCYCLES_MANAGE', name: 'Kelola Master 20 Tipe Motor & Matriks Baut', category: 'Master Data', description: 'Menambah, mengubah, dan memetakan baut pada motor' },
    { code: 'BOLTS_MANAGE', name: 'Kelola Master Spesifikasi Baut & Finishing', category: 'Master Data', description: 'Menambah dan mengubah standar dimensi baut' },
    { code: 'PACKAGES_MANAGE', name: 'Kelola Paket Bundling Baut', category: 'Master Data', description: 'Mengatur formula paket Mesin, Pengereman, dan Full Bike' },
    { code: 'MEDIA_UPLOAD', name: 'Unggah & Hapus Galeri Foto', category: 'Media', description: 'Mengunggah foto spesifikasi baut dan tipe motor' },
    { code: 'CSV_IMPORT_EXPORT', name: 'Impor & Ekspor Data Massal (CSV)', category: 'Data', description: 'Mengimpor matriks kebutuhan baut melalui file CSV' },
    { code: 'SYSTEM_BACKUP_RESTORE', name: 'Pencadangan (Backup) & Pemulihan (Restore)', category: 'Sistem', description: 'Mengunduh dump JSON offline dan memulihkan database' },
    { code: 'AUDIT_LOG_VIEW', name: 'Melihat Catatan Audit Keamanan', category: 'Sistem', description: 'Melihat jejak log aktivitas seluruh pengguna' },
    { code: 'PICKLIST_GENERATE', name: 'Buat & Cetak Daftar Ambil Baut (Pick-List)', category: 'Operasional', description: 'Menghasilkan konsolidasi baut dan mencetak nota SPK' },
    { code: 'SESSION_CHECKLIST', name: 'Jalankan Sesi Ambil Baut Interaktif (HP Android)', category: 'Operasional', description: 'Mencentang baut terambil di depan laci rak' },
  ];

  const permissionsMap = {};
  for (const p of permissionsData) {
    const record = await prisma.permission.upsert({
      where: { code: p.code },
      update: p,
      create: p,
    });
    permissionsMap[p.code] = record;
  }
  console.log(`✅ Seeded ${permissionsData.length} dynamic system permissions.`);

  // 2. Seed Dynamic Roles
  const rolesData = [
    {
      name: 'ADMIN',
      displayName: 'Owner / Administrator',
      description: 'Akses penuh tanpa batas ke seluruh konfigurasi gerai, master data, dan pemeliharaan.',
      isSystem: true,
      permissionCodes: permissionsData.map((p) => p.code),
    },
    {
      name: 'STAFF',
      displayName: 'Staf Gerai / Kasir',
      description: 'Pelayan toko: pencarian motor, pembuatan pick-list baut, dan checklist penyiapan rak.',
      isSystem: false,
      permissionCodes: ['PICKLIST_GENERATE', 'SESSION_CHECKLIST'],
    },
    {
      name: 'TECHNICIAN',
      displayName: 'Teknisi / Mekanik Bengkel',
      description: 'Mekanik bengkel: inspeksi titik pemasangan baut pada unit motor dan checklist perakitan.',
      isSystem: false,
      permissionCodes: ['PICKLIST_GENERATE', 'SESSION_CHECKLIST'],
    },
  ];

  const rolesMap = {};
  for (const r of rolesData) {
    const roleRecord = await prisma.role.upsert({
      where: { name: r.name },
      update: {
        displayName: r.displayName,
        description: r.description,
        isSystem: r.isSystem,
      },
      create: {
        name: r.name,
        displayName: r.displayName,
        description: r.description,
        isSystem: r.isSystem,
      },
    });

    // Sync permissions
    await prisma.rolePermission.deleteMany({ where: { roleId: roleRecord.id } });
    for (const code of r.permissionCodes) {
      if (permissionsMap[code]) {
        await prisma.rolePermission.create({
          data: {
            roleId: roleRecord.id,
            permissionId: permissionsMap[code].id,
          },
        });
      }
    }
    rolesMap[r.name] = roleRecord;
  }
  console.log(`✅ Seeded ${rolesData.length} roles with permission mappings.`);

  // 3. Seed Users
  const passwordHashAdmin = await bcrypt.hash('admin123', 10);
  const passwordHashStaff = await bcrypt.hash('staff123', 10);
  const passwordHashTech = await bcrypt.hash('tech123', 10);

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: passwordHashAdmin, roleId: rolesMap['ADMIN'].id, role: 'ADMIN' },
    create: {
      username: 'admin',
      passwordHash: passwordHashAdmin,
      name: 'Aldi (Owner / Admin)',
      roleId: rolesMap['ADMIN'].id,
      role: 'ADMIN',
      isActive: true,
    },
  });

  const staffUser = await prisma.user.upsert({
    where: { username: 'staff' },
    update: { passwordHash: passwordHashStaff, roleId: rolesMap['STAFF'].id, role: 'STAFF' },
    create: {
      username: 'staff',
      passwordHash: passwordHashStaff,
      name: 'Budi (Staf Gerai)',
      roleId: rolesMap['STAFF'].id,
      role: 'STAFF',
      isActive: true,
    },
  });

  const techUser = await prisma.user.upsert({
    where: { username: 'montir' },
    update: { passwordHash: passwordHashTech, roleId: rolesMap['TECHNICIAN'].id, role: 'TECHNICIAN' },
    create: {
      username: 'montir',
      passwordHash: passwordHashTech,
      name: 'Joko (Teknisi Bengkel)',
      roleId: rolesMap['TECHNICIAN'].id,
      role: 'TECHNICIAN',
      isActive: true,
    },
  });

  console.log('✅ Users seeded:', adminUser.username, staffUser.username, techUser.username);

  // 2. Seed Bolt Positions
  const positionsData = [
    { name: 'Cover Crankcase Kiri / CVT', category: 'Mesin', sortOrder: 1, notes: 'Bak CVT & filter CVT' },
    { name: 'Cover Crankcase Kanan', category: 'Mesin', sortOrder: 2, notes: 'Bak kopling / magnet' },
    { name: 'Cover Radiator & Kipas', category: 'Mesin', sortOrder: 3, notes: 'Grill dan baut pengikat radiator' },
    { name: 'Intake & Throttle Body', category: 'Mesin', sortOrder: 4, notes: 'Manipol & manifold' },
    { name: 'Kaliper Cakram Depan', category: 'Pengereman', sortOrder: 5, notes: 'Baut bracket & kaliper disc depan' },
    { name: 'Kaliper Cakram Belakang', category: 'Pengereman', sortOrder: 6, notes: 'Baut kaliper disc belakang' },
    { name: 'Piringan Cakram Depan', category: 'Pengereman', sortOrder: 7, notes: 'Disc brake rotor depan' },
    { name: 'Piringan Cakram Belakang', category: 'Pengereman', sortOrder: 8, notes: 'Disc brake rotor belakang' },
    { name: 'Master Rem & Klem Stang', category: 'Kemudi', sortOrder: 9, notes: 'Klem tabung minyak rem & saklar' },
    { name: 'Spion & Saklar', category: 'Kemudi', sortOrder: 10, notes: 'Dudukan spion dan panel tombol' },
    { name: 'Windshield & Visor', category: 'Bodi', sortOrder: 11, notes: 'Visor depan bodi' },
    { name: 'Bodi Depan & Dasi', category: 'Bodi', sortOrder: 12, notes: 'Fairing depan dan cover dasi' },
    { name: 'Behel Jok Belakang', category: 'Bodi', sortOrder: 13, notes: 'Pegangan belakang penumpang' },
    { name: 'Footstep Depan', category: 'Rangka', sortOrder: 14, notes: 'Pijakan kaki pengemudi' },
    { name: 'Footstep Belakang', category: 'Rangka', sortOrder: 15, notes: 'Pijakan kaki penumpang' },
    { name: 'Cover Knalpot & Silencer', category: 'Knalpot', sortOrder: 16, notes: 'Pelindung panas dan silencer' },
  ];

  const positionsMap = {};
  for (const pos of positionsData) {
    const record = await prisma.boltPosition.upsert({
      where: { name: pos.name },
      update: pos,
      create: pos,
    });
    positionsMap[pos.name] = record;
  }
  console.log(`✅ Seeded ${positionsData.length} bolt positions.`);

  // 3. Seed Bolt Specifications
  const specsData = [
    { code: 'HEX-M5-15-FL', diameterMm: 5.0, lengthMm: 15.0, headType: 'Flange Hex', threadPitch: '0.8', material: 'Titanium Gr5', finish: 'Glossy', notes: 'Bodi halus & visor' },
    { code: 'HEX-M6-12-FL', diameterMm: 6.0, lengthMm: 12.0, headType: 'Flange Hex', threadPitch: '1.0', material: 'Titanium Gr5', finish: 'Glossy', notes: 'Cover knalpot & filter' },
    { code: 'HEX-M6-15-FL', diameterMm: 6.0, lengthMm: 15.0, headType: 'Flange Hex', threadPitch: '1.0', material: 'Titanium Gr5', finish: 'Glossy', notes: 'Cover bodi & spakbor' },
    { code: 'HEX-M6-20-FL', diameterMm: 6.0, lengthMm: 20.0, headType: 'Flange Hex', threadPitch: '1.0', material: 'Titanium Gr5', finish: 'Glossy', notes: 'Baut serbaguna CVT & radiator' },
    { code: 'HEX-M6-25-FL', diameterMm: 6.0, lengthMm: 25.0, headType: 'Flange Hex', threadPitch: '1.0', material: 'Titanium Gr5', finish: 'Glossy', notes: 'Bak crankcase & CVT panjang' },
    { code: 'HEX-M6-30-FL', diameterMm: 6.0, lengthMm: 30.0, headType: 'Flange Hex', threadPitch: '1.0', material: 'Titanium Gr5', finish: 'Glossy', notes: 'Crankcase tengah' },
    { code: 'HEX-M6-35-FL', diameterMm: 6.0, lengthMm: 35.0, headType: 'Flange Hex', threadPitch: '1.0', material: 'Titanium Gr5', finish: 'Glossy', notes: 'Crankcase & blok silinder' },
    { code: 'HEX-M6-40-FL', diameterMm: 6.0, lengthMm: 40.0, headType: 'Flange Hex', threadPitch: '1.0', material: 'Titanium Gr5', finish: 'Glossy', notes: 'Baut panjang CVT tengah' },
    { code: 'HEX-M6-45-FL', diameterMm: 6.0, lengthMm: 45.0, headType: 'Flange Hex', threadPitch: '1.0', material: 'Titanium Gr5', finish: 'Glossy', notes: 'Baut ekstra panjang CVT' },
    { code: 'HEX-M8-20-FL', diameterMm: 8.0, lengthMm: 20.0, headType: 'Flange Hex', threadPitch: '1.25', material: 'Titanium Gr5', finish: 'Glossy', notes: 'Piringan disc & bracket' },
    { code: 'HEX-M8-25-FL', diameterMm: 8.0, lengthMm: 25.0, headType: 'Flange Hex', threadPitch: '1.25', material: 'Titanium Gr5', finish: 'Glossy', notes: 'Kaliper rem & behel jok' },
    { code: 'HEX-M8-30-FL', diameterMm: 8.0, lengthMm: 30.0, headType: 'Flange Hex', threadPitch: '1.25', material: 'Titanium Gr5', finish: 'Glossy', notes: 'Kaliper rem depan & footstep' },
    { code: 'HEX-M8-35-FL', diameterMm: 8.0, lengthMm: 35.0, headType: 'Flange Hex', threadPitch: '1.25', material: 'Titanium Gr5', finish: 'Glossy', notes: 'Bracket knalpot & sokbreker' },
    { code: 'HEX-M8-40-FL', diameterMm: 8.0, lengthMm: 40.0, headType: 'Flange Hex', threadPitch: '1.25', material: 'Titanium Gr5', finish: 'Glossy', notes: 'Knalpot utama & rangka' },
    { code: 'HEX-M10-25-FL', diameterMm: 10.0, lengthMm: 25.0, headType: 'Flange Hex', threadPitch: '1.25', material: 'Titanium Gr5', finish: 'Glossy', notes: 'Kaliper radial & shock' },
    { code: 'HEX-M10-30-FL', diameterMm: 10.0, lengthMm: 30.0, headType: 'Flange Hex', threadPitch: '1.25', material: 'Titanium Gr5', finish: 'Glossy', notes: 'Bracket kaliper depan besar' },
    { code: 'BTN-M5-15-DO', diameterMm: 5.0, lengthMm: 15.0, headType: 'Button Head', threadPitch: '0.8', material: 'Titanium Gr5', finish: 'Doff', notes: 'Bodi estetis doff' },
    { code: 'BTN-M6-16-DO', diameterMm: 6.0, lengthMm: 16.0, headType: 'Button Head', threadPitch: '1.0', material: 'Titanium Gr5', finish: 'Doff', notes: 'Windshield & visor doff' },
    { code: 'BTN-M6-20-DO', diameterMm: 6.0, lengthMm: 20.0, headType: 'Button Head', threadPitch: '1.0', material: 'Titanium Gr5', finish: 'Doff', notes: 'Cover bodi luar doff' },
  ];

  const specsMap = {};
  for (const s of specsData) {
    const record = await prisma.boltSpec.upsert({
      where: { code: s.code },
      update: s,
      create: s,
    });
    specsMap[s.code] = record;
  }
  console.log(`✅ Seeded ${specsData.length} bolt specifications.`);

  // 4. Seed 20 Popular Motorcycle Types
  const motorcyclesData = [
    { brand: 'Honda', model: 'Vario', variant: '125 eSP', yearStart: 2022, yearEnd: 2026, displayName: 'Honda Vario 125 eSP (2022-2026)', notes: 'Populer modifikasi harian' },
    { brand: 'Honda', model: 'Vario', variant: '160 CBS/ABS', yearStart: 2022, yearEnd: 2026, displayName: 'Honda Vario 160 CBS/ABS (2022-2026)', notes: 'Populer full bike' },
    { brand: 'Honda', model: 'Beat', variant: 'Deluxe', yearStart: 2020, yearEnd: 2026, displayName: 'Honda Beat Deluxe (2020-2026)', notes: 'Volume tinggi' },
    { brand: 'Honda', model: 'Beat', variant: 'Street', yearStart: 2020, yearEnd: 2026, displayName: 'Honda Beat Street (2020-2026)', notes: 'Stang telanjang' },
    { brand: 'Honda', model: 'Scoopy', variant: 'Prestige / Stylish', yearStart: 2021, yearEnd: 2026, displayName: 'Honda Scoopy Prestige / Stylish (2021-2026)', notes: 'Retro modern' },
    { brand: 'Honda', model: 'PCX', variant: '160 ABS', yearStart: 2021, yearEnd: 2026, displayName: 'Honda PCX 160 ABS (2021-2026)', notes: 'Maxi scooter Honda' },
    { brand: 'Honda', model: 'ADV', variant: '160', yearStart: 2022, yearEnd: 2026, displayName: 'Honda ADV 160 (2022-2026)', notes: 'Adventure scooter' },
    { brand: 'Honda', model: 'CBR', variant: '150R', yearStart: 2021, yearEnd: 2026, displayName: 'Honda CBR 150R (2021-2026)', notes: 'Sport fairing' },
    { brand: 'Honda', model: 'CB150R', variant: 'Streetfire', yearStart: 2021, yearEnd: 2026, displayName: 'Honda CB150R Streetfire (2021-2026)', notes: 'Naked sport' },
    { brand: 'Yamaha', model: 'NMAX', variant: '155 Connected', yearStart: 2020, yearEnd: 2024, displayName: 'Yamaha NMAX 155 Connected (2020-2024)', notes: 'Sangat sering modifikasi' },
    { brand: 'Yamaha', model: 'NMAX', variant: 'Turbo', yearStart: 2024, yearEnd: 2026, displayName: 'Yamaha NMAX Turbo (2024-2026)', notes: 'Generasi terbaru YECVT' },
    { brand: 'Yamaha', model: 'Aerox', variant: '155 Connected', yearStart: 2021, yearEnd: 2026, displayName: 'Yamaha Aerox 155 Connected (2021-2026)', notes: 'Favorit modif anak muda' },
    { brand: 'Yamaha', model: 'XMAX', variant: '250 Connected', yearStart: 2023, yearEnd: 2026, displayName: 'Yamaha XMAX 250 Connected (2023-2026)', notes: 'Maxi 250cc' },
    { brand: 'Yamaha', model: 'Fazzio', variant: 'Hybrid Connected', yearStart: 2022, yearEnd: 2026, displayName: 'Yamaha Fazzio Hybrid Connected (2022-2026)', notes: 'Classy Yamaha' },
    { brand: 'Yamaha', model: 'Grand Filano', variant: 'Hybrid Lux/Neo', yearStart: 2023, yearEnd: 2026, displayName: 'Yamaha Grand Filano Hybrid (2023-2026)', notes: 'Classy Yamaha' },
    { brand: 'Yamaha', model: 'WR', variant: '155R', yearStart: 2020, yearEnd: 2026, displayName: 'Yamaha WR 155R (2020-2026)', notes: 'Trail adventure' },
    { brand: 'Suzuki', model: 'Satria', variant: 'F150 Fi', yearStart: 2018, yearEnd: 2026, displayName: 'Suzuki Satria F150 Fi (2018-2026)', notes: 'Hyper underbone' },
    { brand: 'Suzuki', model: 'GSX-R', variant: '150', yearStart: 2018, yearEnd: 2026, displayName: 'Suzuki GSX-R 150 (2018-2026)', notes: 'Sport DOHC' },
    { brand: 'Kawasaki', model: 'Ninja', variant: 'ZX-25R', yearStart: 2021, yearEnd: 2026, displayName: 'Kawasaki Ninja ZX-25R (2021-2026)', notes: '4 silinder premium' },
    { brand: 'Kawasaki', model: 'KLX', variant: '150', yearStart: 2019, yearEnd: 2026, displayName: 'Kawasaki KLX 150 (2019-2026)', notes: 'Dual purpose populer' },
  ];

  const motorsMap = {};
  for (const m of motorcyclesData) {
    const record = await prisma.motorcycleType.upsert({
      where: {
        brand_model_variant_yearStart_yearEnd: {
          brand: m.brand,
          model: m.model,
          variant: m.variant,
          yearStart: m.yearStart,
          yearEnd: m.yearEnd,
        },
      },
      update: m,
      create: m,
    });
    motorsMap[`${m.brand} ${m.model} ${m.variant}`] = record;
  }
  console.log(`✅ Seeded ${motorcyclesData.length} motorcycle types.`);

  // 5. Seed detailed Bolt Requirements for popular bikes (Yamaha NMAX 155, Honda Vario 160, Yamaha Aerox 155, Honda Beat)
  const nmax = motorsMap['Yamaha NMAX 155 Connected'];
  const vario160 = motorsMap['Honda Vario 160 CBS/ABS'];
  const aerox = motorsMap['Yamaha Aerox 155 Connected'];

  const nmaxRequirements = [
    // CVT / Crankcase Kiri
    { pos: 'Cover Crankcase Kiri / CVT', spec: 'HEX-M6-25-FL', qty: 6, side: 'LEFT', order: 1 },
    { pos: 'Cover Crankcase Kiri / CVT', spec: 'HEX-M6-35-FL', qty: 4, side: 'LEFT', order: 2 },
    { pos: 'Cover Crankcase Kiri / CVT', spec: 'HEX-M6-40-FL', qty: 2, side: 'LEFT', order: 3 },
    // Crankcase Kanan
    { pos: 'Cover Crankcase Kanan', spec: 'HEX-M6-25-FL', qty: 5, side: 'RIGHT', order: 4 },
    { pos: 'Cover Crankcase Kanan', spec: 'HEX-M6-30-FL', qty: 3, side: 'RIGHT', order: 5 },
    // Radiator
    { pos: 'Cover Radiator & Kipas', spec: 'HEX-M6-20-FL', qty: 4, side: 'RIGHT', order: 6 },
    // Rem Depan & Belakang
    { pos: 'Kaliper Cakram Depan', spec: 'HEX-M8-30-FL', qty: 2, side: 'FRONT', order: 7 },
    { pos: 'Kaliper Cakram Belakang', spec: 'HEX-M8-25-FL', qty: 2, side: 'REAR', order: 8 },
    { pos: 'Piringan Cakram Depan', spec: 'HEX-M8-20-FL', qty: 3, side: 'FRONT', order: 9 },
    { pos: 'Piringan Cakram Belakang', spec: 'HEX-M8-20-FL', qty: 3, side: 'REAR', order: 10 },
    // Kemudi & Visor
    { pos: 'Master Rem & Klem Stang', spec: 'HEX-M6-20-FL', qty: 4, side: 'NONE', order: 11 },
    { pos: 'Windshield & Visor', spec: 'BTN-M6-16-DO', qty: 4, side: 'FRONT', order: 12 },
    // Bodi & Knalpot
    { pos: 'Behel Jok Belakang', spec: 'HEX-M8-25-FL', qty: 4, side: 'REAR', order: 13 },
    { pos: 'Cover Knalpot & Silencer', spec: 'HEX-M6-12-FL', qty: 3, side: 'RIGHT', order: 14 },
    { pos: 'Cover Knalpot & Silencer', spec: 'HEX-M8-35-FL', qty: 2, side: 'RIGHT', order: 15 },
    { pos: 'Footstep Belakang', spec: 'HEX-M8-30-FL', qty: 4, side: 'NONE', order: 16 },
  ];

  for (const req of nmaxRequirements) {
    await prisma.motorBoltRequirement.upsert({
      where: {
        motorcycleTypeId_boltPositionId_boltSpecId_side: {
          motorcycleTypeId: nmax.id,
          boltPositionId: positionsMap[req.pos].id,
          boltSpecId: specsMap[req.spec].id,
          side: req.side,
        },
      },
      update: { quantity: req.qty, sortOrder: req.order },
      create: {
        motorcycleTypeId: nmax.id,
        boltPositionId: positionsMap[req.pos].id,
        boltSpecId: specsMap[req.spec].id,
        quantity: req.qty,
        side: req.side,
        sortOrder: req.order,
      },
    });
  }

  // Seed Vario 160
  const varioRequirements = [
    { pos: 'Cover Crankcase Kiri / CVT', spec: 'HEX-M6-25-FL', qty: 8, side: 'LEFT', order: 1 },
    { pos: 'Cover Crankcase Kiri / CVT', spec: 'HEX-M6-35-FL', qty: 3, side: 'LEFT', order: 2 },
    { pos: 'Cover Radiator & Kipas', spec: 'HEX-M6-20-FL', qty: 3, side: 'RIGHT', order: 3 },
    { pos: 'Kaliper Cakram Depan', spec: 'HEX-M8-30-FL', qty: 2, side: 'FRONT', order: 4 },
    { pos: 'Piringan Cakram Depan', spec: 'HEX-M8-20-FL', qty: 4, side: 'FRONT', order: 5 },
    { pos: 'Master Rem & Klem Stang', spec: 'HEX-M6-20-FL', qty: 2, side: 'NONE', order: 6 },
    { pos: 'Cover Knalpot & Silencer', spec: 'HEX-M6-12-FL', qty: 2, side: 'RIGHT', order: 7 },
    { pos: 'Cover Knalpot & Silencer', spec: 'HEX-M8-40-FL', qty: 2, side: 'RIGHT', order: 8 },
    { pos: 'Behel Jok Belakang', spec: 'HEX-M8-25-FL', qty: 4, side: 'REAR', order: 9 },
  ];

  for (const req of varioRequirements) {
    await prisma.motorBoltRequirement.upsert({
      where: {
        motorcycleTypeId_boltPositionId_boltSpecId_side: {
          motorcycleTypeId: vario160.id,
          boltPositionId: positionsMap[req.pos].id,
          boltSpecId: specsMap[req.spec].id,
          side: req.side,
        },
      },
      update: { quantity: req.qty, sortOrder: req.order },
      create: {
        motorcycleTypeId: vario160.id,
        boltPositionId: positionsMap[req.pos].id,
        boltSpecId: specsMap[req.spec].id,
        quantity: req.qty,
        side: req.side,
        sortOrder: req.order,
      },
    });
  }

  // Seed Aerox 155
  const aeroxRequirements = [
    { pos: 'Cover Crankcase Kiri / CVT', spec: 'HEX-M6-25-FL', qty: 7, side: 'LEFT', order: 1 },
    { pos: 'Cover Crankcase Kiri / CVT', spec: 'HEX-M6-35-FL', qty: 4, side: 'LEFT', order: 2 },
    { pos: 'Cover Radiator & Kipas', spec: 'HEX-M6-20-FL', qty: 4, side: 'RIGHT', order: 3 },
    { pos: 'Kaliper Cakram Depan', spec: 'HEX-M8-30-FL', qty: 2, side: 'FRONT', order: 4 },
    { pos: 'Piringan Cakram Depan', spec: 'HEX-M8-20-FL', qty: 3, side: 'FRONT', order: 5 },
    { pos: 'Windshield & Visor', spec: 'BTN-M6-16-DO', qty: 4, side: 'FRONT', order: 6 },
    { pos: 'Cover Knalpot & Silencer', spec: 'HEX-M6-12-FL', qty: 3, side: 'RIGHT', order: 7 },
  ];

  for (const req of aeroxRequirements) {
    await prisma.motorBoltRequirement.upsert({
      where: {
        motorcycleTypeId_boltPositionId_boltSpecId_side: {
          motorcycleTypeId: aerox.id,
          boltPositionId: positionsMap[req.pos].id,
          boltSpecId: specsMap[req.spec].id,
          side: req.side,
        },
      },
      update: { quantity: req.qty, sortOrder: req.order },
      create: {
        motorcycleTypeId: aerox.id,
        boltPositionId: positionsMap[req.pos].id,
        boltSpecId: specsMap[req.spec].id,
        quantity: req.qty,
        side: req.side,
        sortOrder: req.order,
      },
    });
  }

  console.log('✅ Seeded requirements matrix for NMAX 155, Vario 160, and Aerox 155.');

  // 6. Seed Packages (Program 3 integration) for NMAX 155
  const pkgMesin = await prisma.package.create({
    data: {
      motorcycleTypeId: nmax.id,
      packageType: 'Mesin',
      name: 'Paket Area Mesin & CVT NMAX 155',
      description: 'Set baut titanium untuk cover CVT, crankcase kanan, dan cover radiator.',
      status: 'ACTIVE',
      items: {
        create: [
          { boltSpecId: specsMap['HEX-M6-25-FL'].id, quantity: 11, emblemNote: 'CVT (6) + Kanan (5)' },
          { boltSpecId: specsMap['HEX-M6-35-FL'].id, quantity: 4, emblemNote: 'CVT (4)' },
          { boltSpecId: specsMap['HEX-M6-40-FL'].id, quantity: 2, emblemNote: 'CVT Tengah (2)' },
          { boltSpecId: specsMap['HEX-M6-30-FL'].id, quantity: 3, emblemNote: 'Kanan (3)' },
          { boltSpecId: specsMap['HEX-M6-20-FL'].id, quantity: 4, emblemNote: 'Radiator (4)' },
        ],
      },
    },
  });

  const pkgPengereman = await prisma.package.create({
    data: {
      motorcycleTypeId: nmax.id,
      packageType: 'Pengereman',
      name: 'Paket Pengereman & Kaliper NMAX 155',
      description: 'Set baut titanium untuk kaliper depan/belakang, disc brake, dan master rem.',
      status: 'ACTIVE',
      items: {
        create: [
          { boltSpecId: specsMap['HEX-M8-30-FL'].id, quantity: 2, emblemNote: 'Kaliper Depan' },
          { boltSpecId: specsMap['HEX-M8-25-FL'].id, quantity: 2, emblemNote: 'Kaliper Belakang' },
          { boltSpecId: specsMap['HEX-M8-20-FL'].id, quantity: 6, emblemNote: 'Disc Brake Depan (3) + Belakang (3)' },
          { boltSpecId: specsMap['HEX-M6-20-FL'].id, quantity: 4, emblemNote: 'Master Rem Stang' },
        ],
      },
    },
  });

  const pkgFull = await prisma.package.create({
    data: {
      motorcycleTypeId: nmax.id,
      packageType: 'Full Bike',
      name: 'Paket Full Bike Titanium NMAX 155',
      description: 'Komposisi lengkap seluruh baut eksterior, pengereman, mesin, dan bodi NMAX 155.',
      status: 'ACTIVE',
      items: {
        create: [
          { boltSpecId: specsMap['HEX-M6-25-FL'].id, quantity: 11, emblemNote: 'Mesin & CVT' },
          { boltSpecId: specsMap['HEX-M6-35-FL'].id, quantity: 4, emblemNote: 'CVT' },
          { boltSpecId: specsMap['HEX-M6-40-FL'].id, quantity: 2, emblemNote: 'CVT' },
          { boltSpecId: specsMap['HEX-M6-30-FL'].id, quantity: 3, emblemNote: 'Mesin Kanan' },
          { boltSpecId: specsMap['HEX-M6-20-FL'].id, quantity: 8, emblemNote: 'Radiator (4) & Master Rem (4)' },
          { boltSpecId: specsMap['HEX-M8-30-FL'].id, quantity: 6, emblemNote: 'Kaliper (2) & Footstep (4)' },
          { boltSpecId: specsMap['HEX-M8-25-FL'].id, quantity: 6, emblemNote: 'Kaliper (2) & Behel (4)' },
          { boltSpecId: specsMap['HEX-M8-20-FL'].id, quantity: 6, emblemNote: 'Disc Rotor (6)' },
          { boltSpecId: specsMap['BTN-M6-16-DO'].id, quantity: 4, emblemNote: 'Visor Windshield' },
          { boltSpecId: specsMap['HEX-M6-12-FL'].id, quantity: 3, emblemNote: 'Cover Knalpot' },
          { boltSpecId: specsMap['HEX-M8-35-FL'].id, quantity: 2, emblemNote: 'Silencer Knalpot' },
        ],
      },
    },
  });

  console.log(`✅ Seeded packages for NMAX 155 (${pkgMesin.name}, ${pkgPengereman.name}, ${pkgFull.name})`);

  // 6. Seed Photos for Bolt Specs and Motorcycles
  console.log('📸 Seeding bolt photos and motorcycle photos...');

  // Bolt Images
  await prisma.boltImage.deleteMany();
  const sampleBoltImages = [
    { specCode: 'HEX-M6-25-FL', url: '/uploads/bolts/titanium-flange-hex-blue.svg', caption: 'Blue Ice Anodized Glossy', isPrimary: true },
    { specCode: 'HEX-M6-25-FL', url: '/uploads/bolts/titanium-flange-hex-gold.svg', caption: 'Royal Gold Anodized Glossy', isPrimary: false },
    { specCode: 'HEX-M6-25-FL', url: '/uploads/bolts/titanium-flange-hex-purple.svg', caption: 'Deep Purple Anodized Glossy', isPrimary: false },
    { specCode: 'HEX-M6-20-FL', url: '/uploads/bolts/titanium-flange-hex-blue.svg', caption: 'Blue Ice Anodized Glossy', isPrimary: true },
    { specCode: 'HEX-M6-20-FL', url: '/uploads/bolts/titanium-flange-hex-gold.svg', caption: 'Royal Gold Anodized Glossy', isPrimary: false },
    { specCode: 'HEX-M8-30-FL', url: '/uploads/bolts/titanium-flange-hex-blue.svg', caption: 'Blue Ice Flange Hex M8', isPrimary: true },
    { specCode: 'HEX-M8-30-FL', url: '/uploads/bolts/titanium-flange-hex-gold.svg', caption: 'Royal Gold Flange Hex M8', isPrimary: false },
    { specCode: 'HEX-M8-20-FL', url: '/uploads/bolts/titanium-flange-hex-blue.svg', caption: 'Blue Ice Disc Rotor Spec', isPrimary: true },
    { specCode: 'HEX-M8-20-FL', url: '/uploads/bolts/titanium-flange-hex-purple.svg', caption: 'Deep Purple Disc Rotor Spec', isPrimary: false },
    { specCode: 'BTN-M6-16-DO', url: '/uploads/bolts/titanium-button-head-doff.svg', caption: 'Raw Matte Titanium Doff (Windshield)', isPrimary: true },
    { specCode: 'BTN-M6-16-DO', url: '/uploads/bolts/titanium-flange-hex-blue.svg', caption: 'Alternatif Warna Blue Ice', isPrimary: false },
    { specCode: 'BTN-M5-15-DO', url: '/uploads/bolts/titanium-button-head-doff.svg', caption: 'Button Head Doff M5', isPrimary: true },
  ];

  for (const img of sampleBoltImages) {
    if (specsMap[img.specCode]) {
      await prisma.boltImage.create({
        data: {
          boltSpecId: specsMap[img.specCode].id,
          url: img.url,
          caption: img.caption,
          isPrimary: img.isPrimary,
        },
      });
    }
  }

  // Motorcycle Images
  await prisma.motorcycleImage.deleteMany();
  if (nmax) {
    await prisma.motorcycleImage.createMany({
      data: [
        { motorcycleTypeId: nmax.id, url: '/uploads/motorcycles/yamaha-nmax-155.svg', caption: 'Tampak Samping Kiri (Titik CVT & Bodi)', isPrimary: true },
        { motorcycleTypeId: nmax.id, url: '/uploads/motorcycles/yamaha-aerox-155.svg', caption: 'Area Pengereman Depan & Master Rem', isPrimary: false },
      ],
    });
  }

  if (vario160) {
    await prisma.motorcycleImage.create({
      data: {
        motorcycleTypeId: vario160.id,
        url: '/uploads/motorcycles/honda-vario-160.svg',
        caption: 'Tampak Samping Kiri & Bak Mesin eSP+',
        isPrimary: true,
      },
    });
  }

  if (aerox) {
    await prisma.motorcycleImage.create({
      data: {
        motorcycleTypeId: aerox.id,
        url: '/uploads/motorcycles/yamaha-aerox-155.svg',
        caption: 'Tampak Samping Kiri Sport Matic VVA',
        isPrimary: true,
      },
    });
  }

  console.log('✅ Seeded sample photos for bolt specs and motorcycles.');

  const { attachSampleGlbModels } = require('../scripts/attachSampleGlbModels');
  const glbSummary = await attachSampleGlbModels(prisma, { overwrite: true });
  console.log(`✅ Seeded ${glbSummary.attachedModels} 3D .glb models and ${glbSummary.attachedAnnotations} 3D position annotations.`);

  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

