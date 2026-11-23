const { PrismaClient } = require('@prisma/client');
const { loadCatalogItems, pickCatalogItem, upsertCatalog } = require('../src/utils/catalog');
const { PERMISSION_CATALOG } = require('../src/utils/permissions');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Hex Titanium Database Seeding...');

  // 1. Seed Dynamic Permissions
  // Feature catalog shared with the server (Kelola Sistem > Kelola Peran & Hak Akses)
  const permissionsData = PERMISSION_CATALOG;

  const permissionsMap = {};
  for (const p of permissionsData) {
    const data = { name: p.name, category: p.category, description: p.description };
    const record = await prisma.permission.upsert({
      where: { code: p.code },
      update: data,
      create: { code: p.code, ...data },
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
      description: 'Pelayan toko: buka Paket Full Bike dan Bundling, lalu jalankan checklist pembeli di Riwayat.',
      isSystem: false,
      permissionCodes: PERMISSION_CATALOG.filter((p) => p.defaultRoles?.includes('STAFF')).map((p) => p.code),
    },
    {
      name: 'TECHNICIAN',
      displayName: 'Teknisi / Mekanik Bengkel',
      description: 'Mekanik bengkel: panduan pasang per posisi dan checklist pemasangan baut.',
      isSystem: false,
      permissionCodes: PERMISSION_CATALOG.filter((p) => p.defaultRoles?.includes('TECHNICIAN')).map((p) => p.code),
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

  // 4. Motorcycle types already in the system. Kept as rows; their former sample content
  //    (bolt matrix, packages, photos, 3D models, close-ups) is no longer seeded.
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

  for (const m of motorcyclesData) {
    await prisma.motorcycleType.upsert({
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
  }
  console.log(`✅ Seeded ${motorcyclesData.length} existing motorcycle types (no sample bolt data).`);

  // 5. Master Barang = the shop's product catalog (seeder/Katalog_HexTi_Baut_Titanium.xlsx, converted by
  //    scripts/katalog_xlsx_to_json.py): every product by name with its catalog photo or a generated picture.
  const catalogItems = loadCatalogItems();
  const catalogSpecs = await upsertCatalog(prisma, catalogItems);
  console.log(`✅ Seeded ${catalogItems.length} Master Barang items from the shop catalog.`);

  // Motor data (positions, bolt sizes per position, Zona) from docs/Hex_Ti_Spesifikasi_Baut.xlsx
  // (converted by scripts/xlsx_to_seed_json.py). Each size row is fitted with the catalog bolt of that size
  // (Bighead, else Smallhead; M6/M8 nuts with the hexagon nut) and marked CEK FISIK; sizes the shop does
  // not sell are left out (owner's decision, 23 Nov 2026).
  const katalog = require('./data/hexti-katalog-baut.json');
  const sizeSpecs = Object.fromEntries(katalog.specs.map((sp) => [sp.code, sp]));
  const catalogFor = (sizeCode) => {
    const item = pickCatalogItem(catalogItems, sizeSpecs[sizeCode]);
    return item ? catalogSpecs[item.code] : null;
  };

  // 5b. Catalog motorcycles with their own positions and requirement matrix
  const catalogMotors = [];
  let positionCount = 0;
  let requirementCount = 0;
  for (const m of katalog.motorcycles) {
    const motoData = {
      brand: m.brand,
      model: m.model,
      variant: m.variant,
      yearStart: m.yearStart,
      yearEnd: m.yearEnd,
      displayName: m.displayName,
      notes: m.notes,
    };
    // yearEnd is null (catalog edition only), so look the row up instead of using the compound unique key
    const existingMoto = await prisma.motorcycleType.findFirst({
      where: { brand: m.brand, model: m.model, variant: m.variant, yearStart: m.yearStart, yearEnd: m.yearEnd },
    });
    const moto = existingMoto
      ? await prisma.motorcycleType.update({ where: { id: existingMoto.id }, data: motoData })
      : await prisma.motorcycleType.create({ data: motoData });

    const positionsByName = {};
    for (const p of m.positions) {
      const posData = { name: p.name, category: p.category, sortOrder: p.sortOrder, notes: p.notes };
      const existingPos = await prisma.boltPosition.findFirst({ where: { motorcycleTypeId: moto.id, name: p.name } });
      positionsByName[p.name] = existingPos
        ? await prisma.boltPosition.update({ where: { id: existingPos.id }, data: posData })
        : await prisma.boltPosition.create({ data: { ...posData, motorcycleTypeId: moto.id } });
      positionCount += 1;
    }

    const requirementRows = [];
    for (const r of m.requirements) {
      const spec = catalogFor(r.specCode);
      if (!spec) continue; // size not sold by the shop
      const key = {
        motorcycleTypeId: moto.id,
        boltPositionId: positionsByName[r.position].id,
        boltSpecId: spec.id,
        side: r.side,
      };
      const data = { quantity: r.quantity, isOptional: r.isOptional, isCritical: r.isCritical, sortOrder: r.sortOrder, notes: r.notes };
      // CEK FISIK on create (head variant still to confirm); a row the owner already verified keeps its status on reseed
      const row = await prisma.motorBoltRequirement.upsert({
        where: { motorcycleTypeId_boltPositionId_boltSpecId_side: key },
        update: data,
        create: { ...key, ...data, sizeStatus: 'CEK_FISIK' },
      });
      requirementRows.push({ row, source: r });
      requirementCount += 1;
    }
    catalogMotors.push({ moto, catalog: m, requirementRows });
  }
  console.log(`✅ Seeded ${katalog.motorcycles.length} catalog motorcycles, ${positionCount} positions, ${requirementCount} requirement rows.`);

  // 5c. Bundlings derived from the workbook: "Bundling Full Bike" = all Scope DEFAULT rows (README),
  //     plus Bodi Halus / Bodi Kasar = the same DEFAULT rows split by the Zona column. Prices are set by the owner.
  const packageDefs = [
    { name: 'Bundling Full Bike', packageType: 'Bundling Full Bike', zona: null, description: 'Semua baut bagian terlihat / body luar.' },
    { name: 'Bodi Halus', packageType: 'Bodi Halus', zona: 'HALUS', description: 'Baut zona halus: panel, cover, lampu, jok, spakbor.' },
    { name: 'Bodi Kasar', packageType: 'Bodi Kasar', zona: 'KASAR', description: 'Baut zona kasar: cover mesin & CVT, rem, rangka, knalpot, stang.' },
  ];
  let packageCount = 0;
  for (const { moto, catalog, requirementRows } of catalogMotors) {
    for (const def of packageDefs) {
      const items = requirementRows
        .map(({ row, source }) => {
          const byZona = source.defaultQtyByZona || {};
          const quantity = def.zona ? (byZona[def.zona] || 0) : Object.values(byZona).reduce((a, b) => a + b, 0);
          return { boltSpecId: row.boltSpecId, sourceRequirementId: row.id, quantity, emblemNote: source.position };
        })
        .filter((item) => item.quantity > 0);
      if (items.length === 0) continue;

      const name = `${def.name} ${catalog.model} ${catalog.variant}`;
      const pkgData = { packageType: def.packageType, name, description: def.description, status: 'ACTIVE' };
      const existingPkg = await prisma.package.findFirst({ where: { motorcycleTypeId: moto.id, name } });
      if (existingPkg) {
        await prisma.package.update({ where: { id: existingPkg.id }, data: pkgData });
        await prisma.packageItem.deleteMany({ where: { packageId: existingPkg.id } });
        await prisma.packageItem.createMany({ data: items.map((item) => ({ ...item, packageId: existingPkg.id })) });
      } else {
        await prisma.package.create({ data: { ...pkgData, motorcycleTypeId: moto.id, items: { create: items } } });
      }
      packageCount += 1;
    }
  }
  console.log(`✅ Seeded ${packageCount} bundlings (Bundling Full Bike / Bodi Halus / Bodi Kasar) from Scope & Zona columns.`);

  // 5d. Motorcycle side views (uploads/motorcycles) and 3D .glb models (uploads/models, scripts/generateMotorcycleGlb.js)
  //     for the motorcycles they were made for. Existing images, models and admin 3D annotations are kept.
  const motorMedia = [
    { match: 'Yamaha NMAX 155 Connected', url: '/uploads/motorcycles/yamaha-nmax-155.svg', caption: 'Tampak Samping Kiri (Titik CVT & Bodi)' },
    { match: 'Honda Vario 160 CBS/ABS', url: '/uploads/motorcycles/honda-vario-160.svg', caption: 'Tampak Samping Kiri & Bak Mesin eSP+' },
    { match: 'Yamaha Aerox 155 Connected', url: '/uploads/motorcycles/yamaha-aerox-155.svg', caption: 'Tampak Samping Kiri Sport Matic VVA' },
  ];
  let motorImageCount = 0;
  for (const media of motorMedia) {
    const motor = await prisma.motorcycleType.findFirst({ where: { displayName: { contains: media.match, mode: 'insensitive' } } });
    if (!motor || await prisma.motorcycleImage.findFirst({ where: { motorcycleTypeId: motor.id, url: media.url } })) continue;
    const hasPrimary = await prisma.motorcycleImage.count({ where: { motorcycleTypeId: motor.id, isPrimary: true } });
    await prisma.motorcycleImage.create({
      data: { motorcycleTypeId: motor.id, url: media.url, caption: media.caption, isPrimary: hasPrimary === 0 },
    });
    motorImageCount += 1;
  }
  const { attachSampleGlbModels } = require('../scripts/attachSampleGlbModels');
  const glbSummary = await attachSampleGlbModels(prisma, { overwrite: false });
  console.log(`✅ Attached ${motorImageCount} motorcycle photos and ${glbSummary.attachedModels} 3D .glb models (existing models & annotations preserved).`);

  if (process.argv.includes('--with-demo-annotations')) {
    const { seedDemoAnnotations } = require('../scripts/seedDemoAnnotations');
    const demoSummary = await seedDemoAnnotations(prisma);
    console.log(`✅ [DEMO] Seeded ${demoSummary.createdCount} demo 3D annotations.`);
  }

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

