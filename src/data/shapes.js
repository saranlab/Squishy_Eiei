import * as THREE from 'three'

// Shared segment counts — must match between SculptStudio and DeformableToy
export const CS = 32  // composed shape segments

export const COMPOSED_SHAPES = [
  { id: 'sphere',    emoji: '⚫', label: 'Circle',    frontZ: 1.04, build: () => new THREE.SphereGeometry(1, CS, CS) },
  { id: 'box',       emoji: '⬛', label: 'Square',    frontZ: 0.76, build: () => new THREE.BoxGeometry(1.5, 1.5, 1.5, 8, 8, 8) },
  { id: 'cylinder',  emoji: '💿', label: 'Cylinder',  frontZ: 1.04, build: () => new THREE.CylinderGeometry(1, 1, 0.6, CS, 6) },
  { id: 'rectangle', emoji: '▬',  label: 'Rectangle', frontZ: 0.52, build: () => new THREE.BoxGeometry(2.2, 1.0, 1.0, 10, 6, 6) },
]

export function buildComposedGeo(shapeId) {
  const base = COMPOSED_SHAPES.find(s => s.id === shapeId)?.build() ?? new THREE.SphereGeometry(1, CS, CS)
  // toNonIndexed() gives every triangle its own vertices — required so
  // vertex-color painting doesn't bleed across shared edges at seams
  return base.toNonIndexed()
}

export function getFrontZ(shapeId) {
  return COMPOSED_SHAPES.find(s => s.id === shapeId)?.frontZ ?? 1.04
}

export function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]
}

export function makeVertexColors(geo, hex) {
  const [r, g, b] = hexToRgb(hex)
  const count = geo.attributes.position.count
  const arr = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) { arr[i*3] = r; arr[i*3+1] = g; arr[i*3+2] = b }
  return arr
}

// Smooth normals for non-indexed geometry by averaging face normals at each unique position.
// Three.js computeVertexNormals() on non-indexed gives flat shading (one normal per face).
// This groups vertices by position (1e-3 precision) and averages their face normals.
export function computeWeldedNormals(geo) {
  const pos = geo.attributes.position
  const n = pos.count
  // Face normals (same normal for all 3 vertices of each triangle)
  const fNorm = new Float32Array(n * 3)
  for (let i = 0; i < n; i += 3) {
    const ax = pos.getX(i), ay = pos.getY(i), az = pos.getZ(i)
    const ex = pos.getX(i+1)-ax, ey = pos.getY(i+1)-ay, ez = pos.getZ(i+1)-az
    const fx = pos.getX(i+2)-ax, fy = pos.getY(i+2)-ay, fz = pos.getZ(i+2)-az
    const nx = ey*fz - ez*fy, ny = ez*fx - ex*fz, nz = ex*fy - ey*fx
    for (let j = 0; j < 3; j++) { fNorm[(i+j)*3]=nx; fNorm[(i+j)*3+1]=ny; fNorm[(i+j)*3+2]=nz }
  }
  // Group by rounded position, accumulate and normalize
  const map = new Map()
  for (let i = 0; i < n; i++) {
    const k = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(i)
  }
  const norm = new Float32Array(n * 3)
  for (const ids of map.values()) {
    let sx = 0, sy = 0, sz = 0
    for (const i of ids) { sx += fNorm[i*3]; sy += fNorm[i*3+1]; sz += fNorm[i*3+2] }
    const len = Math.sqrt(sx*sx + sy*sy + sz*sz) || 1
    for (const i of ids) { norm[i*3]=sx/len; norm[i*3+1]=sy/len; norm[i*3+2]=sz/len }
  }
  geo.setAttribute('normal', new THREE.BufferAttribute(norm, 3))
}
