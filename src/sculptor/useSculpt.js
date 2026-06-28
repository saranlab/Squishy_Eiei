import { useMemo, useState, useCallback } from 'react'
import * as THREE from 'three'

// 12 control point directions on unit sphere
export const CP_DIRS = [
  [0, 1, 0],            // top
  [0, -1, 0],           // bottom
  [1, 0, 0],            // right
  [-1, 0, 0],           // left
  [0, 0, 1],            // front
  [0, 0, -1],           // back
  [0.707, 0.707, 0],    // top-right
  [-0.707, 0.707, 0],   // top-left
  [0.707, 0, 0.707],    // front-right
  [-0.707, 0, 0.707],   // front-left
  [0, -0.707, 0.707],   // front-bottom
  [0, 0.707, 0.707],    // front-top
]

// Build the base subdivided sphere geometry
function buildBaseSphere(radius = 1, widthSeg = 20, heightSeg = 20) {
  const geo = new THREE.SphereGeometry(radius, widthSeg, heightSeg)
  const pos = geo.attributes.position.array
  const idx = geo.index ? Array.from(geo.index.array) : null
  return {
    positions: new Float32Array(pos),
    indices: idx,
    widthSeg,
    heightSeg,
  }
}

// Find index of vertex closest to a direction on unit sphere
function nearestVertex(positions, dir) {
  let best = -1, bestDot = -Infinity
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2]
    const len = Math.sqrt(x * x + y * y + z * z)
    const dot = (x / len) * dir[0] + (y / len) * dir[1] + (z / len) * dir[2]
    if (dot > bestDot) { bestDot = dot; best = i / 3 }
  }
  return best
}

// Apply radial deformation around a control point
function applyDeform(positions, cpPos, normalDir, delta, radius = 0.85) {
  const result = new Float32Array(positions)
  const [nx, ny, nz] = normalDir
  const [cx, cy, cz] = cpPos

  for (let i = 0; i < result.length; i += 3) {
    const dx = result[i] - cx
    const dy = result[i + 1] - cy
    const dz = result[i + 2] - cz
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (dist < radius) {
      const falloff = Math.pow(1 - dist / radius, 2)
      result[i]     += nx * delta * falloff
      result[i + 1] += ny * delta * falloff
      result[i + 2] += nz * delta * falloff
    }
  }
  return result
}

export function useSculpt() {
  const base = useMemo(() => buildBaseSphere(), [])

  const [positions, setPositions] = useState(() => new Float32Array(base.positions))

  // Compute current control point world positions from deformed geometry
  const cpVertexIndices = useMemo(
    () => CP_DIRS.map(dir => nearestVertex(base.positions, dir)),
    [base.positions]
  )

  const cpPositions = useMemo(() => {
    return cpVertexIndices.map(vi => [
      positions[vi * 3],
      positions[vi * 3 + 1],
      positions[vi * 3 + 2],
    ])
  }, [positions, cpVertexIndices])

  const deform = useCallback((cpIndex, delta) => {
    setPositions(prev => {
      const cpPos = [
        prev[cpVertexIndices[cpIndex] * 3],
        prev[cpVertexIndices[cpIndex] * 3 + 1],
        prev[cpVertexIndices[cpIndex] * 3 + 2],
      ]
      return applyDeform(prev, cpPos, CP_DIRS[cpIndex], delta)
    })
  }, [cpVertexIndices])

  const reset = useCallback(() => {
    setPositions(new Float32Array(base.positions))
  }, [base.positions])

  return {
    positions,
    indices: base.indices,
    cpPositions,
    deform,
    reset,
  }
}
