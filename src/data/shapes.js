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

// Build vertex groups from a positions array: vertices at the same rounded position
// are grouped together. Used to pre-compute weld structure once, then run per-frame.
export function buildVertexGroups(posArray) {
  const n = posArray.length / 3
  const map = new Map()
  for (let i = 0; i < n; i++) {
    const kx = Math.round(posArray[i*3]   * 1000)
    const ky = Math.round(posArray[i*3+1] * 1000)
    const kz = Math.round(posArray[i*3+2] * 1000)
    const k = `${kx},${ky},${kz}`
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(i)
  }
  return Array.from(map.values())
}

// Apply welded normals using pre-computed groups (fast — no Map rebuild, safe to call per-frame).
export function applyWeldedNormals(geo, groups) {
  const pos = geo.attributes.position
  const n = pos.count
  const fNorm = new Float32Array(n * 3)
  for (let i = 0; i < n; i += 3) {
    const ax = pos.getX(i), ay = pos.getY(i), az = pos.getZ(i)
    const ex = pos.getX(i+1)-ax, ey = pos.getY(i+1)-ay, ez = pos.getZ(i+1)-az
    const fx = pos.getX(i+2)-ax, fy = pos.getY(i+2)-ay, fz = pos.getZ(i+2)-az
    const nx = ey*fz - ez*fy, ny = ez*fx - ex*fz, nz = ex*fy - ey*fx
    for (let j = 0; j < 3; j++) { fNorm[(i+j)*3]=nx; fNorm[(i+j)*3+1]=ny; fNorm[(i+j)*3+2]=nz }
  }
  let normAttr = geo.attributes.normal
  if (!normAttr || normAttr.count !== n) {
    normAttr = new THREE.BufferAttribute(new Float32Array(n * 3), 3)
    geo.setAttribute('normal', normAttr)
  }
  const norm = normAttr.array
  for (const ids of groups) {
    let sx = 0, sy = 0, sz = 0
    for (const i of ids) { sx += fNorm[i*3]; sy += fNorm[i*3+1]; sz += fNorm[i*3+2] }
    const len = Math.sqrt(sx*sx + sy*sy + sz*sz) || 1
    const nx = sx/len, ny = sy/len, nz = sz/len
    for (const i of ids) { norm[i*3]=nx; norm[i*3+1]=ny; norm[i*3+2]=nz }
  }
  normAttr.needsUpdate = true
}

// Convenience: build groups and apply in one call (for initial geometry setup).
export function computeWeldedNormals(geo) {
  applyWeldedNormals(geo, buildVertexGroups(geo.attributes.position.array))
}
