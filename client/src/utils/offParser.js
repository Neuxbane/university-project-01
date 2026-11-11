import * as THREE from 'three';

/**
 * Parses Object File Format (.off / COFF / NOFF / CNOFF) text into a Three.js BufferGeometry.
 * Supports arbitrary N-gon faces (via fan triangulation), optional vertex normals,
 * and optional per-vertex or per-face RGB/RGBA colors.
 */
export function parseOffToGeometry(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Konten format OFF kosong.');
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, '').trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error('Format OFF tidak lengkap.');
  }

  // Parse header (e.g. "OFF", "COFF", "NOFF", "CNOFF", or "OFF 8 6 0")
  const headerTokens = lines[0].split(/\s+/);
  const headerTag = headerTokens[0].toUpperCase();
  if (!/^(ST)?(C?N?)OFF$/.test(headerTag)) {
    throw new Error('Header wajib diawali kata OFF (atau COFF/NOFF).');
  }

  const hasVertexNormal = headerTag.includes('N');
  const hasVertexColor = headerTag.includes('C');

  let cursor = 1;
  let countsTokens = headerTokens.slice(1);
  if (countsTokens.length < 2) {
    countsTokens = lines[cursor].split(/\s+/);
    cursor++;
  }

  const numVerts = parseInt(countsTokens[0], 10);
  const numFaces = parseInt(countsTokens[1], 10);

  if (!Number.isInteger(numVerts) || numVerts < 3 || !Number.isInteger(numFaces) || numFaces < 1) {
    throw new Error('Jumlah vertex (>= 3) dan face (>= 1) pada header OFF tidak valid.');
  }
  if (cursor + numVerts + numFaces > lines.length) {
    throw new Error(
      `Jumlah baris kurang: butuh ${numVerts} vertex dan ${numFaces} face, tersedia ${Math.max(0, lines.length - cursor)} baris.`
    );
  }

  const verts = [];
  const vNormals = [];
  const vColors = [];
  let foundAnyColor = false;

  const normalizeColorComponent = (val) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return 0.6;
    return n > 1 ? Math.min(1, Math.max(0, n / 255)) : Math.min(1, Math.max(0, n));
  };

  for (let i = 0; i < numVerts; i++) {
    const parts = lines[cursor++].split(/\s+/).map(Number);
    if (parts.length < 3 || parts.slice(0, 3).some((v) => !Number.isFinite(v))) {
      throw new Error(`Baris vertex ke-${i + 1} tidak valid.`);
    }
    verts.push([parts[0], parts[1], parts[2]]);

    let idx = 3;
    if (hasVertexNormal && parts.length >= idx + 3) {
      vNormals.push([parts[idx], parts[idx + 1], parts[idx + 2]]);
      idx += 3;
    } else {
      vNormals.push(null);
    }

    if (hasVertexColor && parts.length >= idx + 3) {
      foundAnyColor = true;
      vColors.push([
        normalizeColorComponent(parts[idx]),
        normalizeColorComponent(parts[idx + 1]),
        normalizeColorComponent(parts[idx + 2]),
      ]);
    } else if (!hasVertexNormal && !hasVertexColor && parts.length >= 6) {
      // Some OFF exporters attach RGB directly after x y z without COFF header
      foundAnyColor = true;
      vColors.push([
        normalizeColorComponent(parts[3]),
        normalizeColorComponent(parts[4]),
        normalizeColorComponent(parts[5]),
      ]);
    } else {
      vColors.push(null);
    }
  }

  const positions = [];
  const normals = [];
  const colors = [];
  let hasAllNormals = hasVertexNormal;
  let faceCountTriangles = 0;

  for (let f = 0; f < numFaces; f++) {
    const parts = lines[cursor++].split(/\s+/);
    const nSides = parseInt(parts[0], 10);
    if (!Number.isInteger(nSides) || nSides < 3 || parts.length < 1 + nSides) {
      throw new Error(`Baris face ke-${f + 1} tidak valid.`);
    }

    const indices = [];
    for (let k = 0; k < nSides; k++) {
      const vi = parseInt(parts[1 + k], 10);
      if (!Number.isInteger(vi) || vi < 0 || vi >= numVerts) {
        throw new Error(`Indeks vertex pada face ke-${f + 1} di luar jangkauan (0..${numVerts - 1}).`);
      }
      indices.push(vi);
    }

    // Optional per-face RGB/RGBA after vertex indices
    let faceColor = null;
    const extraParts = parts.slice(1 + nSides).map(Number);
    if (extraParts.length >= 3 && extraParts.slice(0, 3).every((v) => Number.isFinite(v))) {
      foundAnyColor = true;
      faceColor = [
        normalizeColorComponent(extraParts[0]),
        normalizeColorComponent(extraParts[1]),
        normalizeColorComponent(extraParts[2]),
      ];
    }

    // Fan-triangulate polygon
    const v0 = indices[0];
    for (let k = 1; k < indices.length - 1; k++) {
      const v1 = indices[k];
      const v2 = indices[k + 1];
      const tri = [v0, v1, v2];
      for (const vi of tri) {
        positions.push(...verts[vi]);
        if (vNormals[vi]) {
          normals.push(...vNormals[vi]);
        } else {
          hasAllNormals = false;
        }
        const c = vColors[vi] || faceColor || [0.62, 0.67, 0.74];
        colors.push(...c);
      }
      faceCountTriangles++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (hasAllNormals && normals.length === positions.length) {
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  } else {
    geometry.computeVertexNormals();
  }
  if (foundAnyColor) {
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return {
    geometry,
    vertexCount: numVerts,
    faceCount: numFaces,
    triangleCount: faceCountTriangles,
    hasColors: foundAnyColor,
  };
}
