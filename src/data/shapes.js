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
