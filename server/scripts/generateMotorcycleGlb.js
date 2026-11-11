#!/usr/bin/env node
/**
 * Offline Procedural 3D Motorcycle .glb Generator (glTF 2.0 Binary)
 * Generates lightweight, workshop-ready .glb models for Indonesian motorcycles
 * with distinct PBR materials and exact bolt-position surface anchors.
 */

const fs = require('fs');
const path = require('path');

class GeometryBuilder {
  constructor() {
    this.positions = [];
    this.normals = [];
    this.indices = [];
  }

  get vertexCount() {
    return this.positions.length / 3;
  }

  addTriangle(p1, p2, p3, nOverride = null) {
    const ux = p2[0] - p1[0];
    const uy = p2[1] - p1[1];
    const uz = p2[2] - p1[2];
    const vx = p3[0] - p1[0];
    const vy = p3[1] - p1[1];
    const vz = p3[2] - p1[2];

    let nx = nOverride ? nOverride[0] : uy * vz - uz * vy;
    let ny = nOverride ? nOverride[1] : uz * vx - ux * vz;
    let nz = nOverride ? nOverride[2] : ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;

    const base = this.vertexCount;
    this.positions.push(...p1, ...p2, ...p3);
    this.normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    this.indices.push(base, base + 1, base + 2);
  }

  addQuad(p1, p2, p3, p4) {
    this.addTriangle(p1, p2, p3);
    this.addTriangle(p1, p3, p4);
  }

  addBox(cx, cy, cz, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    const hx = sx / 2;
    const hy = sy / 2;
    const hz = sz / 2;
    const raw = [
      [-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz],
      [-hx, -hy, -hz], [hx, -hy, -hz], [hx, hy, -hz], [-hx, hy, -hz],
    ];
    const pts = raw.map((p) => transformPoint(p, cx, cy, cz, rx, ry, rz));
    // +Z front
    this.addQuad(pts[0], pts[1], pts[2], pts[3]);
    // -Z back
    this.addQuad(pts[5], pts[4], pts[7], pts[6]);
    // +X right
    this.addQuad(pts[1], pts[5], pts[6], pts[2]);
    // -X left
    this.addQuad(pts[4], pts[0], pts[3], pts[7]);
    // +Y top
    this.addQuad(pts[3], pts[2], pts[6], pts[7]);
    // -Y bottom
    this.addQuad(pts[4], pts[5], pts[1], pts[0]);
  }

  /**
   * Cylinder oriented along Z-axis by default (ideal for wheels & brake discs)
   */
  addCylinderZ(cx, cy, cz, radiusTop, radiusBot, depth, segments = 20, rx = 0, ry = 0, rz = 0) {
    const hz = depth / 2;
    const frontCenter = transformPoint([0, 0, hz], cx, cy, cz, rx, ry, rz);
    const backCenter = transformPoint([0, 0, -hz], cx, cy, cz, rx, ry, rz);

    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      const c0 = Math.cos(a0);
      const s0 = Math.sin(a0);
      const c1 = Math.cos(a1);
      const s1 = Math.sin(a1);

      const f0 = transformPoint([radiusTop * c0, radiusTop * s0, hz], cx, cy, cz, rx, ry, rz);
      const f1 = transformPoint([radiusTop * c1, radiusTop * s1, hz], cx, cy, cz, rx, ry, rz);
      const b0 = transformPoint([radiusBot * c0, radiusBot * s0, -hz], cx, cy, cz, rx, ry, rz);
      const b1 = transformPoint([radiusBot * c1, radiusBot * s1, -hz], cx, cy, cz, rx, ry, rz);

      // Front cap (+Z)
      this.addTriangle(frontCenter, f0, f1);
      // Back cap (-Z)
      this.addTriangle(backCenter, b1, b0);
      // Side wall
      this.addQuad(b0, b1, f1, f0);
    }
  }

  /**
   * Torus ring in XY plane (ideal for realistic motorcycle tires)
   */
  addTorusZ(cx, cy, cz, majorRadius, tubeRadius, radialSegs = 24, tubularSegs = 12) {
    const ring = [];
    for (let i = 0; i <= radialSegs; i++) {
      const u = (i / radialSegs) * Math.PI * 2;
      const cu = Math.cos(u);
      const su = Math.sin(u);
      const row = [];
      for (let j = 0; j <= tubularSegs; j++) {
        const v = (j / tubularSegs) * Math.PI * 2;
        const cv = Math.cos(v);
        const sv = Math.sin(v);
        const x = (majorRadius + tubeRadius * cv) * cu + cx;
        const y = (majorRadius + tubeRadius * cv) * su + cy;
        const z = tubeRadius * sv + cz;
        row.push([x, y, z]);
      }
      ring.push(row);
    }
    for (let i = 0; i < radialSegs; i++) {
      for (let j = 0; j < tubularSegs; j++) {
        const p00 = ring[i][j];
        const p10 = ring[i + 1][j];
        const p11 = ring[i + 1][j + 1];
        const p01 = ring[i][j + 1];
        this.addQuad(p00, p10, p11, p01);
      }
    }
  }

  /**
   * Extrude closed 2D XY polygon along Z axis [-depth/2, +depth/2] centered at cz
   */
  addExtrudeXY(points2D, cz, depth) {
    const hz = depth / 2;
    const n = points2D.length;
    if (n < 3) return;
    // Compute centroid for fan triangulation (works well for convex/mildly concave profiles)
    let area = 0;
    for (let i = 0; i < n; i++) {
      const [x0, y0] = points2D[i];
      const [x1, y1] = points2D[(i + 1) % n];
      area += x0 * y1 - x1 * y0;
    }
    const pts = area >= 0 ? points2D : [...points2D].reverse();
    const cx = pts.reduce((s, p) => s + p[0], 0) / n;
    const cy = pts.reduce((s, p) => s + p[1], 0) / n;

    const fCenter = [cx, cy, cz + hz];
    const bCenter = [cx, cy, cz - hz];
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      const fa = [a[0], a[1], cz + hz];
      const fb = [b[0], b[1], cz + hz];
      const ba = [a[0], a[1], cz - hz];
      const bb = [b[0], b[1], cz - hz];
      this.addTriangle(fCenter, fa, fb);
      this.addTriangle(bCenter, bb, ba);
      this.addQuad(ba, bb, fb, fa);
    }
  }

  /**
   * Tube between two 3D points (great for telescopic forks, exhaust headers, grab rails, shock absorbers)
   */
  addSegmentCylinder(pStart, pEnd, rStart, rEnd, segments = 12) {
    const dx = pEnd[0] - pStart[0];
    const dy = pEnd[1] - pStart[1];
    const dz = pEnd[2] - pStart[2];
    const len = Math.hypot(dx, dy, dz) || 1;
    const dir = [dx / len, dy / len, dz / len];
    const up = Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const side1 = normalize(cross(up, dir));
    const side2 = normalize(cross(dir, side1));

    const ringA = [];
    const ringB = [];
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      ringA.push([
        pStart[0] + rStart * (ca * side1[0] + sa * side2[0]),
        pStart[1] + rStart * (ca * side1[1] + sa * side2[1]),
        pStart[2] + rStart * (ca * side1[2] + sa * side2[2]),
      ]);
      ringB.push([
        pEnd[0] + rEnd * (ca * side1[0] + sa * side2[0]),
        pEnd[1] + rEnd * (ca * side1[1] + sa * side2[1]),
        pEnd[2] + rEnd * (ca * side1[2] + sa * side2[2]),
      ]);
    }

    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      this.addQuad(ringA[i], ringA[next], ringB[next], ringB[i]);
      this.addTriangle(pStart, ringA[next], ringA[i]);
      this.addTriangle(pEnd, ringB[i], ringB[next]);
    }
  }
}

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

function transformPoint([x, y, z], tx, ty, tz, rx, ry, rz) {
  // Rotate X
  let y1 = y * Math.cos(rx) - z * Math.sin(rx);
  let z1 = y * Math.sin(rx) + z * Math.cos(rx);
  let x1 = x;
  // Rotate Y
  let x2 = x1 * Math.cos(ry) + z1 * Math.sin(ry);
  let z2 = -x1 * Math.sin(ry) + z1 * Math.cos(ry);
  let y2 = y1;
  // Rotate Z
  let x3 = x2 * Math.cos(rz) - y2 * Math.sin(rz);
  let y3 = x2 * Math.sin(rz) + y2 * Math.cos(rz);
  let z3 = z2;
  return [x3 + tx, y3 + ty, z3 + tz];
}

/**
 * Compile array of { name, materialIndex, builder } parts into a valid GLB 2.0 Buffer
 */
function compileGLB(parts, materials) {
  const accessors = [];
  const bufferViews = [];
  const meshes = [];
  const nodes = [];
  const binChunks = [];
  let byteOffset = 0;

  const appendBuffer = (typedArray, target) => {
    const raw = Buffer.from(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
    const padLen = (4 - (raw.byteLength % 4)) % 4;
    const bvIdx = bufferViews.length;
    bufferViews.push({
      buffer: 0,
      byteOffset,
      byteLength: raw.byteLength,
      ...(target ? { target } : {}),
    });
    binChunks.push(raw);
    if (padLen > 0) binChunks.push(Buffer.alloc(padLen));
    byteOffset += raw.byteLength + padLen;
    return bvIdx;
  };

  for (const part of parts) {
    const b = part.builder;
    if (b.indices.length === 0) continue;

    const posArr = new Float32Array(b.positions);
    const normArr = new Float32Array(b.normals);
    const useUint32 = b.vertexCount > 65535;
    const idxArr = useUint32 ? new Uint32Array(b.indices) : new Uint16Array(b.indices);

    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < posArr.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        if (posArr[i + k] < min[k]) min[k] = posArr[i + k];
        if (posArr[i + k] > max[k]) max[k] = posArr[i + k];
      }
    }

    const posBv = appendBuffer(posArr, 34962); // ARRAY_BUFFER
    const normBv = appendBuffer(normArr, 34962);
    const idxBv = appendBuffer(idxArr, 34963); // ELEMENT_ARRAY_BUFFER

    const posAcc = accessors.length;
    accessors.push({
      bufferView: posBv,
      componentType: 5126, // FLOAT
      count: b.vertexCount,
      type: 'VEC3',
      min,
      max,
    });

    const normAcc = accessors.length;
    accessors.push({
      bufferView: normBv,
      componentType: 5126,
      count: b.vertexCount,
      type: 'VEC3',
    });

    const idxAcc = accessors.length;
    accessors.push({
      bufferView: idxBv,
      componentType: useUint32 ? 5125 : 5123, // UNSIGNED_INT or UNSIGNED_SHORT
      count: b.indices.length,
      type: 'SCALAR',
    });

    const meshIdx = meshes.length;
    meshes.push({
      name: part.name,
      primitives: [
        {
          attributes: { POSITION: posAcc, NORMAL: normAcc },
          indices: idxAcc,
          material: part.materialIndex,
        },
      ],
    });

    nodes.push({
      name: part.name,
      mesh: meshIdx,
    });
  }

  const rootNodeIndices = nodes.map((_, i) => i);
  const gltf = {
    asset: {
      version: '2.0',
      generator: 'HexTitanium-Offline-Motorcycle-GLB',
    },
    scene: 0,
    scenes: [{ name: 'MotorcycleScene', nodes: rootNodeIndices }],
    nodes,
    meshes,
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: byteOffset }],
  };

  const jsonRaw = Buffer.from(JSON.stringify(gltf), 'utf8');
  const jsonPad = (4 - (jsonRaw.byteLength % 4)) % 4;
  const jsonChunk = Buffer.concat([jsonRaw, Buffer.alloc(jsonPad, 0x20)]);
  const binChunk = Buffer.concat(binChunks);

  const totalLength = 12 + 8 + jsonChunk.byteLength + 8 + binChunk.byteLength;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // 'glTF'
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);

  const jsonHdr = Buffer.alloc(8);
  jsonHdr.writeUInt32LE(jsonChunk.byteLength, 0);
  jsonHdr.writeUInt32LE(0x4e4f534a, 4); // 'JSON'

  const binHdr = Buffer.alloc(8);
  binHdr.writeUInt32LE(binChunk.byteLength, 0);
  binHdr.writeUInt32LE(0x004e4942, 4); // 'BIN\0'

  return Buffer.concat([header, jsonHdr, jsonChunk, binHdr, binChunk]);
}

function buildScooterModel(spec) {
  const {
    primaryColor,      // [r, g, b, 1]
    accentColor,       // [r, g, b, 1]
    caliperColor,      // [r, g, b, 1]
    wheelbase = 1.32,
    frontTireR = 0.255,
    rearTireR = 0.255,
    hasCenterTunnel = true,
    tallVisor = true,
    dualShock = true,
    rearDisc = true,
  } = spec;

  const materials = [
    { name: 'BodyPaint', pbrMetallicRoughness: { baseColorFactor: primaryColor, metallicFactor: 0.45, roughnessFactor: 0.32 } },
    { name: 'MatteTrim', pbrMetallicRoughness: { baseColorFactor: [0.11, 0.12, 0.14, 1], metallicFactor: 0.12, roughnessFactor: 0.72 } },
    { name: 'RubberTire', pbrMetallicRoughness: { baseColorFactor: [0.06, 0.06, 0.07, 1], metallicFactor: 0.02, roughnessFactor: 0.9 } },
    { name: 'AlloySilver', pbrMetallicRoughness: { baseColorFactor: [0.78, 0.81, 0.85, 1], metallicFactor: 0.85, roughnessFactor: 0.26 } },
    { name: 'GunmetalCVT', pbrMetallicRoughness: { baseColorFactor: [0.27, 0.31, 0.36, 1], metallicFactor: 0.75, roughnessFactor: 0.38 } },
    { name: 'AnodizedGold', pbrMetallicRoughness: { baseColorFactor: caliperColor, metallicFactor: 0.88, roughnessFactor: 0.22 } },
    { name: 'SmokedVisor', pbrMetallicRoughness: { baseColorFactor: [0.09, 0.13, 0.18, 1], metallicFactor: 0.35, roughnessFactor: 0.12 } },
    { name: 'SeatVinyl', pbrMetallicRoughness: { baseColorFactor: [0.12, 0.11, 0.12, 1], metallicFactor: 0.05, roughnessFactor: 0.84 } },
    { name: 'AccentPaint', pbrMetallicRoughness: { baseColorFactor: accentColor, metallicFactor: 0.5, roughnessFactor: 0.28 } },
    { name: 'LEDWhite', pbrMetallicRoughness: { baseColorFactor: [0.95, 0.98, 1.0, 1], metallicFactor: 0.1, roughnessFactor: 0.15 }, emissiveFactor: [0.35, 0.4, 0.45] },
  ];

  const fx = wheelbase / 2;
  const rx = -wheelbase / 2;
  const parts = [];
  const addPart = (name, materialIndex, fn) => {
    const builder = new GeometryBuilder();
    fn(builder);
    parts.push({ name, materialIndex, builder });
  };

  // 1. Front & Rear Tires
  addPart('Roda_Ban', 2, (g) => {
    g.addTorusZ(fx, frontTireR, 0, frontTireR - 0.048, 0.048, 28, 12);
    g.addTorusZ(rx, rearTireR, 0, rearTireR - 0.055, 0.055, 28, 12);
  });

  // 2. Alloy Rims & Hub
  addPart('Velg_Roda', 3, (g) => {
    const rfRim = frontTireR - 0.088;
    const rrRim = rearTireR - 0.095;
    g.addCylinderZ(fx, frontTireR, 0, 0.045, 0.045, 0.095, 14);
    g.addCylinderZ(rx, rearTireR, 0, 0.05, 0.05, 0.11, 14);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.addSegmentCylinder(
        [fx, frontTireR, 0],
        [fx + Math.cos(a) * rfRim, frontTireR + Math.sin(a) * rfRim, 0],
        0.016,
        0.012,
        8
      );
      g.addSegmentCylinder(
        [rx, rearTireR, 0],
        [rx + Math.cos(a) * rrRim, rearTireR + Math.sin(a) * rrRim, 0],
        0.018,
        0.014,
        8
      );
    }
    // Outer rim lip ring approximation via thin segmented cylinders
    for (let i = 0; i < 18; i++) {
      const a0 = (i / 18) * Math.PI * 2;
      const a1 = ((i + 1) / 18) * Math.PI * 2;
      g.addSegmentCylinder(
        [fx + Math.cos(a0) * rfRim, frontTireR + Math.sin(a0) * rfRim, 0],
        [fx + Math.cos(a1) * rfRim, frontTireR + Math.sin(a1) * rfRim, 0],
        0.013, 0.013, 6
      );
      g.addSegmentCylinder(
        [rx + Math.cos(a0) * rrRim, rearTireR + Math.sin(a0) * rrRim, 0],
        [rx + Math.cos(a1) * rrRim, rearTireR + Math.sin(a1) * rrRim, 0],
        0.015, 0.015, 6
      );
    }
  });

  // 3. Brake Discs (Front Left, Rear Right if dual disc)
  addPart('Piringan_Depan', 3, (g) => {
    g.addCylinderZ(fx, frontTireR, -0.058, 0.118, 0.118, 0.008, 22);
  });
  addPart('Kaliper_Depan', 5, (g) => {
    g.addBox(fx - 0.088, frontTireR + 0.035, -0.068, 0.052, 0.072, 0.044, 0, 0, -0.35);
  });

  if (rearDisc) {
    addPart('Piringan_Belakang', 3, (g) => {
      g.addCylinderZ(rx, rearTireR, 0.068, 0.105, 0.105, 0.008, 20);
    });
    addPart('Kaliper_Belakang', 5, (g) => {
      g.addBox(rx + 0.068, rearTireR + 0.058, 0.075, 0.05, 0.062, 0.04, 0, 0, 0.45);
    });
  }

  // 4. Front Telescopic Fork + Fender
  addPart('Suspensi_Depan', 3, (g) => {
    const topX = fx - 0.18;
    const topY = 0.78;
    for (const zOff of [-0.075, 0.075]) {
      g.addSegmentCylinder([fx, frontTireR, zOff], [topX, topY, zOff], 0.022, 0.02, 10);
      g.addSegmentCylinder([fx, frontTireR, zOff], [fx - 0.07, frontTireR + 0.23, zOff], 0.029, 0.029, 10);
    }
    // Lower axle + fork bridge
    g.addSegmentCylinder([fx, frontTireR, -0.085], [fx, frontTireR, 0.085], 0.015, 0.015, 8);
    g.addBox(fx - 0.13, 0.63, 0, 0.06, 0.04, 0.18, 0, 0, 0.34);
  });

  addPart('Spakbor_Depan', 0, (g) => {
    g.addBox(fx + 0.03, frontTireR + 0.255, 0, 0.28, 0.035, 0.145, 0, 0, -0.18);
    g.addBox(fx - 0.11, frontTireR + 0.21, 0, 0.14, 0.035, 0.145, 0, 0, 0.55);
  });

  // 5. Main Frame, Front Shield & Side Fairing
  addPart('Bodi_Utama', 0, (g) => {
    // Front nose & cowl
    g.addExtrudeXY(
      [
        [fx + 0.16, 0.52],
        [fx + 0.06, 0.79],
        [fx - 0.14, 0.87],
        [fx - 0.26, 0.76],
        [fx - 0.23, 0.36],
        [fx + 0.02, 0.44],
      ],
      0,
      0.34
    );
    // Side fairing wings
    g.addBox(fx - 0.06, 0.62, 0, 0.32, 0.26, 0.39, 0, 0, 0.25);

    if (hasCenterTunnel) {
      // Maxi-scooter center tunnel
      g.addBox(0.05, 0.42, 0, 0.52, 0.22, 0.16);
      // Lower floor rails left & right
      g.addBox(0.04, 0.27, -0.15, 0.56, 0.06, 0.13);
      g.addBox(0.04, 0.27, 0.15, 0.56, 0.06, 0.13);
    } else {
      // Flat floorboard (Vario style)
      g.addBox(0.06, 0.29, 0, 0.52, 0.07, 0.38);
    }

    // Rear side tail body panels (swept up toward tail)
    g.addExtrudeXY(
      [
        [-0.14, 0.34],
        [rx - 0.18, 0.64],
        [rx - 0.23, 0.78],
        [-0.18, 0.68],
      ],
      0,
      0.34
    );
    g.addBox(rx + 0.16, 0.62, 0, 0.52, 0.17, 0.37, 0, 0, -0.2);
  });

  // Accent fairing strips & LED Headlight
  addPart('Aksen_Bodi', 8, (g) => {
    g.addBox(fx - 0.04, 0.72, -0.185, 0.24, 0.07, 0.03, 0, 0, 0.35);
    g.addBox(fx - 0.04, 0.72, 0.185, 0.24, 0.07, 0.03, 0, 0, 0.35);
    g.addBox(rx + 0.18, 0.65, -0.18, 0.34, 0.05, 0.025, 0, 0, -0.22);
    g.addBox(rx + 0.18, 0.65, 0.18, 0.34, 0.05, 0.025, 0, 0, -0.22);
  });

  addPart('Lampu_Depan', 9, (g) => {
    g.addBox(fx + 0.13, 0.64, -0.075, 0.05, 0.075, 0.1, 0, 0.15, -0.2);
    g.addBox(fx + 0.13, 0.64, 0.075, 0.05, 0.075, 0.1, 0, -0.15, -0.2);
  });

  // 6. Windshield / Visor
  addPart('Windshield_Visor', 6, (g) => {
    const visorH = tallVisor ? 0.32 : 0.17;
    const visorY = tallVisor ? 0.99 : 0.92;
    g.addBox(fx - 0.12, visorY, 0, 0.022, visorH, 0.28, 0, 0, 0.42);
  });

  // 7. Handlebar & Master Brake Cylinders
  addPart('Master_Rem_Stang', 1, (g) => {
    const barX = fx - 0.21;
    const barY = 0.89;
    g.addSegmentCylinder([barX, barY, -0.32], [barX, barY, 0.32], 0.014, 0.014, 10);
    // Grips
    g.addSegmentCylinder([barX, barY, -0.35], [barX, barY, -0.21], 0.021, 0.021, 10);
    g.addSegmentCylinder([barX, barY, 0.21], [barX, barY, 0.35], 0.021, 0.021, 10);
    // Left & Right Master Rem Reservoirs
    g.addBox(barX + 0.025, barY + 0.025, -0.17, 0.045, 0.038, 0.055);
    g.addBox(barX + 0.025, barY + 0.025, 0.17, 0.045, 0.038, 0.055);
    // Speedometer housing
    g.addBox(barX + 0.04, barY - 0.01, 0, 0.08, 0.04, 0.15, 0, 0, -0.45);
  });

  // 8. Seat & Rear Grab Rail (Behel Jok)
  addPart('Jok_Motor', 7, (g) => {
    g.addBox(-0.24, 0.72, 0, 0.36, 0.095, 0.27, 0, 0, -0.05);
    g.addBox(-0.56, 0.77, 0, 0.34, 0.1, 0.25, 0, 0, -0.14);
  });

  addPart('Behel_Jok', 3, (g) => {
    const bx = rx - 0.12;
    const by = 0.78;
    g.addSegmentCylinder([bx + 0.14, by - 0.02, -0.15], [bx - 0.08, by + 0.03, -0.12], 0.017, 0.017, 8);
    g.addSegmentCylinder([bx + 0.14, by - 0.02, 0.15], [bx - 0.08, by + 0.03, 0.12], 0.017, 0.017, 8);
    g.addSegmentCylinder([bx - 0.08, by + 0.03, -0.12], [bx - 0.08, by + 0.03, 0.12], 0.018, 0.018, 8);
  });

  // 9. Rear Fender & Tail Light
  addPart('Spakbor_Belakang', 1, (g) => {
    g.addBox(rx - 0.16, 0.56, 0, 0.18, 0.03, 0.16, 0, 0, 0.75);
  });

  // 10. Engine Crankcase Core + Left CVT Cover
  addPart('Mesin_Blok', 4, (g) => {
    g.addBox(-0.24, 0.27, 0, 0.28, 0.19, 0.22);
  });

  addPart('Cover_CVT', 4, (g) => {
    // Elongated CVT housing on LEFT (-Z)
    g.addBox(-0.42, 0.28, -0.15, 0.52, 0.16, 0.08, 0, 0, 0.05);
    g.addCylinderZ(-0.19, 0.29, -0.15, 0.11, 0.11, 0.085, 18);
    g.addCylinderZ(rx, rearTireR + 0.03, -0.14, 0.095, 0.095, 0.08, 18);
    // Airbox right above CVT
    g.addBox(-0.46, 0.44, -0.15, 0.29, 0.13, 0.09, 0, 0, -0.08);
  });

  // 11. Right Side Crankcase + Radiator Shroud
  addPart('Cover_Radiator', 1, (g) => {
    g.addCylinderZ(-0.21, 0.29, 0.145, 0.095, 0.095, 0.055, 16);
    g.addBox(-0.21, 0.29, 0.175, 0.14, 0.14, 0.018);
  });

  // 12. Exhaust Muffler + Heat Shield (Cover Knalpot on RIGHT +Z)
  addPart('Cover_Knalpot', 3, (g) => {
    // Header pipe
    g.addSegmentCylinder([-0.22, 0.21, 0.11], [-0.42, 0.23, 0.16], 0.018, 0.02, 8);
    // Matte muffler body (material via dark box? keep metallic tube + brushed heat shield)
    g.addSegmentCylinder([-0.41, 0.23, 0.165], [rx - 0.14, 0.37, 0.185], 0.052, 0.06, 12);
    // Heat shield outer plate
    g.addBox(rx + 0.06, 0.31, 0.222, 0.34, 0.085, 0.018, 0, 0, -0.25);
  });

  // 13. Rear Shock Absorbers
  addPart('Shock_Belakang', 5, (g) => {
    if (dualShock) {
      for (const zSide of [-0.125, 0.125]) {
        g.addSegmentCylinder([rx + 0.02, 0.34, zSide], [rx + 0.16, 0.62, zSide], 0.024, 0.024, 10);
      }
    } else {
      g.addSegmentCylinder([rx + 0.08, 0.34, -0.12], [rx + 0.22, 0.62, -0.12], 0.026, 0.026, 10);
    }
  });

  // 14. Pillion Footsteps (Left & Right)
  addPart('Footstep_Belakang', 3, (g) => {
    for (const zSide of [-0.21, 0.21]) {
      g.addBox(-0.34, 0.37, zSide, 0.09, 0.032, 0.055);
    }
  });

  const glbBuffer = compileGLB(parts, materials);

  // Compute exact world surface anchor coordinates matching this motorcycle geometry
  const anchors = [
    {
      positionName: 'Cover Crankcase Kiri / CVT',
      label: 'Bak CVT Kiri',
      x: -0.42,
      y: 0.29,
      z: -0.192,
      normalX: 0,
      normalY: 0,
      normalZ: -1,
    },
    {
      positionName: 'Cover Crankcase Kanan',
      label: 'Crankcase Kanan',
      x: -0.24,
      y: 0.27,
      z: 0.115,
      normalX: 0,
      normalY: 0,
      normalZ: 1,
    },
    {
      positionName: 'Cover Radiator & Kipas',
      label: 'Cover Kipas / Radiator',
      x: -0.21,
      y: 0.29,
      z: 0.186,
      normalX: 0,
      normalY: 0,
      normalZ: 1,
    },
    {
      positionName: 'Kaliper Cakram Depan',
      label: 'Kaliper Rem Depan',
      x: Number((fx - 0.088).toFixed(4)),
      y: Number((frontTireR + 0.035).toFixed(4)),
      z: -0.091,
      normalX: 0,
      normalY: 0,
      normalZ: -1,
    },
    {
      positionName: 'Piringan Cakram Depan',
      label: 'Disc Brake Depan',
      x: Number((fx + 0.06).toFixed(4)),
      y: Number((frontTireR + 0.05).toFixed(4)),
      z: -0.063,
      normalX: 0,
      normalY: 0,
      normalZ: -1,
    },
    {
      positionName: 'Master Rem & Klem Stang',
      label: 'Master Rem Kanan',
      x: Number((fx - 0.185).toFixed(4)),
      y: 0.916,
      z: 0.17,
      normalX: 0.3,
      normalY: 0.9,
      normalZ: 0.2,
    },
    {
      positionName: 'Windshield & Visor',
      label: 'Visor Depan',
      x: Number((fx - 0.095).toFixed(4)),
      y: tallVisor ? 0.98 : 0.91,
      z: 0,
      normalX: 0.92,
      normalY: 0.38,
      normalZ: 0,
    },
    {
      positionName: 'Behel Jok Belakang',
      label: 'Behel Belakang',
      x: Number((rx - 0.08).toFixed(4)),
      y: 0.815,
      z: 0.08,
      normalX: -0.4,
      normalY: 0.9,
      normalZ: 0.2,
    },
    {
      positionName: 'Cover Knalpot & Silencer',
      label: 'Tameng Knalpot',
      x: Number((rx + 0.06).toFixed(4)),
      y: 0.31,
      z: 0.232,
      normalX: 0,
      normalY: 0,
      normalZ: 1,
    },
    {
      positionName: 'Footstep Belakang',
      label: 'Footstep Kiri',
      x: -0.34,
      y: 0.37,
      z: -0.238,
      normalX: 0,
      normalY: 0,
      normalZ: -1,
    },
  ];

  if (rearDisc) {
    anchors.push(
      {
        positionName: 'Kaliper Cakram Belakang',
        label: 'Kaliper Rem Belakang',
        x: Number((rx + 0.068).toFixed(4)),
        y: Number((rearTireR + 0.058).toFixed(4)),
        z: 0.096,
        normalX: 0,
        normalY: 0,
        normalZ: 1,
      },
      {
        positionName: 'Piringan Cakram Belakang',
        label: 'Disc Brake Belakang',
        x: Number((rx - 0.05).toFixed(4)),
        y: Number((rearTireR - 0.04).toFixed(4)),
        z: 0.073,
        normalX: 0,
        normalY: 0,
        normalZ: 1,
      }
    );
  }

  return { glbBuffer, anchors };
}

const MODEL_SPECS = [
  {
    filename: 'yamaha-nmax-155.glb',
    displayNameMatch: 'Yamaha NMAX 155 Connected',
    primaryColor: [0.11, 0.22, 0.39, 1], // Signature Matte Deep Navy
    accentColor: [0.65, 0.71, 0.78, 1],  // Titanium Silver accents
    caliperColor: [0.88, 0.67, 0.14, 1], // Gold calipers & shock spring
    wheelbase: 1.34,
    frontTireR: 0.255,
    rearTireR: 0.255,
    hasCenterTunnel: true,
    tallVisor: true,
    dualShock: true,
    rearDisc: true,
  },
  {
    filename: 'honda-vario-160.glb',
    displayNameMatch: 'Honda Vario 160 CBS/ABS',
    primaryColor: [0.72, 0.11, 0.15, 1], // Sporty Racing Red
    accentColor: [0.15, 0.16, 0.18, 1],  // Satin Carbon trim
    caliperColor: [0.85, 0.62, 0.12, 1],
    wheelbase: 1.28,
    frontTireR: 0.245,
    rearTireR: 0.245,
    hasCenterTunnel: false,
    tallVisor: false,
    dualShock: false,
    rearDisc: true,
  },
  {
    filename: 'yamaha-aerox-155.glb',
    displayNameMatch: 'Yamaha Aerox 155 Connected',
    primaryColor: [0.05, 0.45, 0.68, 1], // Yamaha Racing Cyan-Blue
    accentColor: [0.88, 0.92, 0.18, 1],  // Neon fluo accent
    caliperColor: [0.88, 0.68, 0.15, 1],
    wheelbase: 1.35,
    frontTireR: 0.26,
    rearTireR: 0.26,
    hasCenterTunnel: true,
    tallVisor: false,
    dualShock: true,
    rearDisc: false,
  },
];

function generateAllModels(outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const manifest = [];

  for (const spec of MODEL_SPECS) {
    const { glbBuffer, anchors } = buildScooterModel(spec);
    const outPath = path.join(outputDir, spec.filename);
    fs.writeFileSync(outPath, glbBuffer);
    manifest.push({
      filename: spec.filename,
      modelUrl: `/uploads/models/${spec.filename}`,
      displayNameMatch: spec.displayNameMatch,
      byteLength: glbBuffer.byteLength,
      anchors,
    });
  }

  return manifest;
}

if (require.main === module) {
  const outputDir = path.join(__dirname, '../uploads/models');
  const manifest = generateAllModels(outputDir);
  for (const item of manifest) {
    console.log(`✅ Generated ${item.filename} (${(item.byteLength / 1024).toFixed(1)} KB, ${item.anchors.length} anchors)`);
  }
}

module.exports = { generateAllModels, buildScooterModel, MODEL_SPECS };
