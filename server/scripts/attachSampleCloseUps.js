#!/usr/bin/env node
/**
 * Generates clean offline close-up illustration SVGs for CVT cover & Front Brake Caliper
 * and attaches starter multi-bolt CloseUpPhoto + CloseUpBoltPin rows to Vario 160 & NMAX 155
 * (idempotent: only attaches if motorcycle has zero close-up photos).
 */

const fs = require('fs');
const path = require('path');
const prisma = require('../src/db');

const CVT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#18181b"/>
      <stop offset="100%" stop-color="#09090b"/>
    </linearGradient>
    <linearGradient id="cvtMetal" x1="0" y1="0" x2="0.8" y2="1">
      <stop offset="0%" stop-color="#3f3f46"/>
      <stop offset="55%" stop-color="#27272a"/>
      <stop offset="100%" stop-color="#18181b"/>
    </linearGradient>
    <linearGradient id="silverRim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#71717a"/>
      <stop offset="50%" stop-color="#a1a1aa"/>
      <stop offset="100%" stop-color="#52525b"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#bg)"/>
  <!-- Swingarm / frame shadows -->
  <path d="M90 120 Q410 70 675 180 L690 340 Q420 420 125 360 Z" fill="#0f0f12" stroke="#27272a" stroke-width="3"/>
  <!-- Main CVT Crankcase Housing -->
  <path d="M120 235 C120 155 190 125 265 140 L545 170 C625 180 680 220 680 275 C680 340 620 385 535 385 L260 360 C175 352 120 305 120 235 Z" fill="url(#cvtMetal)" stroke="url(#silverRim)" stroke-width="5"/>
  <!-- Inner sculpted ribs -->
  <circle cx="255" cy="252" r="88" fill="#1f1f24" stroke="#52525b" stroke-width="3"/>
  <circle cx="255" cy="252" r="52" fill="#2e2e35" stroke="#71717a" stroke-width="2"/>
  <circle cx="575" cy="275" r="78" fill="#1f1f24" stroke="#52525b" stroke-width="3"/>
  <circle cx="575" cy="275" r="34" fill="#18181b" stroke="#71717a" stroke-width="2"/>
  <rect x="330" y="218" width="175" height="68" rx="18" fill="#232329" stroke="#52525b" stroke-width="2"/>
  <text x="417" y="258" text-anchor="middle" fill="#71717a" font-family="monospace" font-size="18" font-weight="bold">CVT COVER</text>
  <!-- Bolt Hole Bosses around perimeter & center -->
  <g fill="#09090b" stroke="#a1a1aa" stroke-width="2.5">
    <!-- Front long dowel bosses (M6x40) -->
    <circle cx="215" cy="148" r="10"/>
    <circle cx="155" cy="228" r="10"/>
    <!-- Perimeter medium bosses (M6x25) -->
    <circle cx="330" cy="155" r="9"/>
    <circle cx="445" cy="166" r="9"/>
    <circle cx="560" cy="182" r="9"/>
    <circle cx="655" cy="260" r="9"/>
    <circle cx="545" cy="374" r="9"/>
    <circle cx="385" cy="364" r="9"/>
    <circle cx="230" cy="348" r="9"/>
    <!-- Center deep bosses (M6x35) -->
    <circle cx="415" cy="210" r="10"/>
    <circle cx="415" cy="296" r="10"/>
    <circle cx="515" cy="275" r="10"/>
  </g>
</svg>`;

const CALIPER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <defs>
    <linearGradient id="cbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#18181b"/>
      <stop offset="100%" stop-color="#09090b"/>
    </linearGradient>
    <linearGradient id="goldCaliper" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#92400e"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#cbg)"/>
  <!-- Brake Rotor Disc -->
  <circle cx="450" cy="260" r="205" fill="#27272a" stroke="#71717a" stroke-width="8"/>
  <circle cx="450" cy="260" r="135" fill="#18181b" stroke="#52525b" stroke-width="4"/>
  <circle cx="450" cy="260" r="65" fill="#09090b" stroke="#71717a" stroke-width="3"/>
  <!-- Fork Lower Leg -->
  <rect x="200" y="30" width="68" height="390" rx="22" fill="#2e2e36" stroke="#71717a" stroke-width="4"/>
  <!-- Caliper Bracket & Gold Caliper Body -->
  <path d="M225 180 L345 145 C375 140 390 165 390 205 L385 320 C385 350 355 365 325 355 L225 310 Z" fill="url(#goldCaliper)" stroke="#fbbf24" stroke-width="3"/>
  <text x="315" y="255" text-anchor="middle" fill="#fef3c7" font-family="monospace" font-size="16" font-weight="bold">KALIPER</text>
  <!-- Caliper Mounting Bolts (M8x30) -->
  <g fill="#09090b" stroke="#e4e4e7" stroke-width="3">
    <circle cx="240" cy="195" r="11"/>
    <circle cx="240" cy="300" r="11"/>
    <!-- Disc Mounting Bolts (M8x20) -->
    <circle cx="450" cy="150" r="10"/>
    <circle cx="555" cy="260" r="10"/>
    <circle cx="450" cy="370" r="10"/>
    <circle cx="350" cy="295" r="10"/>
  </g>
</svg>`;

async function attachSampleCloseUps(db = prisma, { overwrite = false } = {}) {
  const dir = path.join(__dirname, '../uploads/closeups');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'cvt-kiri-closeup.svg'), CVT_SVG);
  fs.writeFileSync(path.join(dir, 'kaliper-depan-closeup.svg'), CALIPER_SVG);

  const [specs, positions, targetMotors] = await Promise.all([
    db.boltSpec.findMany(),
    db.boltPosition.findMany(),
    db.motorcycleType.findMany({
      where: {
        OR: [
          { displayName: { contains: 'Vario 160', mode: 'insensitive' } },
          { displayName: { contains: 'NMAX 155', mode: 'insensitive' } },
          { displayName: { contains: 'Aerox 155', mode: 'insensitive' } },
        ],
      },
    }),
  ]);

  const specByCode = new Map(specs.map((s) => [s.code, s]));
  const posByName = new Map(positions.map((p) => [p.name, p]));

  const cvtPos = posByName.get('Cover Crankcase Kiri / CVT');
  const kaliperPos = posByName.get('Kaliper Cakram Depan');
  const m6x25 = specByCode.get('HEX-M6-25-FL');
  const m6x35 = specByCode.get('HEX-M6-35-FL');
  const m6x40 = specByCode.get('HEX-M6-40-FL');
  const m8x30 = specByCode.get('HEX-M8-30-FL');
  const m8x20 = specByCode.get('HEX-M8-20-FL');

  let photosCreated = 0;
  let pinsCreated = 0;

  for (const motor of targetMotors) {
    if (overwrite) {
      await db.closeUpPhoto.deleteMany({ where: { motorcycleTypeId: motor.id } });
    }
    const existingCount = await db.closeUpPhoto.count({ where: { motorcycleTypeId: motor.id } });
    if (existingCount > 0) continue;

    if (cvtPos && m6x25 && m6x35) {
      const cvtPhoto = await db.closeUpPhoto.create({
        data: {
          motorcycleTypeId: motor.id,
          boltPositionId: cvtPos.id,
          imageUrl: '/uploads/closeups/cvt-kiri-closeup.svg',
          caption: `Close-Up Area CVT Kiri ${motor.model} (Multi-ukuran baut)`,
        },
      });
      photosCreated++;

      const cvtPins = [
        { boltSpecId: m6x25.id, x: 41.2, y: 31.0, quantity: 6, label: 'Bibir Luar Atas CVT' },
        { boltSpecId: m6x35.id, x: 52.0, y: 59.0, quantity: 3, label: 'Bos Tengah Bak CVT' },
      ];
      if (m6x40 && motor.displayName.includes('NMAX')) {
        cvtPins.push({ boltSpecId: m6x40.id, x: 26.8, y: 29.6, quantity: 2, label: 'Baut Panjang Depan CVT' });
      }
      await db.closeUpBoltPin.createMany({
        data: cvtPins.map((p) => ({ ...p, closeUpPhotoId: cvtPhoto.id })),
      });
      pinsCreated += cvtPins.length;
    }

    if (kaliperPos && m8x30 && m8x20) {
      const calPhoto = await db.closeUpPhoto.create({
        data: {
          motorcycleTypeId: motor.id,
          boltPositionId: kaliperPos.id,
          imageUrl: '/uploads/closeups/kaliper-depan-closeup.svg',
          caption: `Close-Up Pengereman Depan ${motor.model} (Kaliper + Piringan)`,
        },
      });
      photosCreated++;

      const calPins = [
        { boltSpecId: m8x30.id, x: 30.0, y: 39.0, quantity: 2, label: 'Breket Kaliper Atas & Bawah' },
        { boltSpecId: m8x20.id, x: 56.2, y: 30.0, quantity: 4, label: 'Baut Piringan Cakram' },
      ];
      await db.closeUpBoltPin.createMany({
        data: calPins.map((p) => ({ ...p, closeUpPhotoId: calPhoto.id })),
      });
      pinsCreated += calPins.length;
    }
  }

  return { photosCreated, pinsCreated };
}

if (require.main === module) {
  attachSampleCloseUps(prisma)
    .then((res) => {
      console.log(`✅ Attached ${res.photosCreated} close-up photos and ${res.pinsCreated} multi-bolt pins.`);
    })
    .catch((err) => {
      console.error('❌ Failed to attach close-ups:', err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { attachSampleCloseUps };
