import { useRef, useMemo, useState, useCallback, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { playSquish, playCrack } from '../SoundEngine'
import { buildComposedGeo, makeVertexColors, getFrontZ } from '../data/shapes'

const SEGS = 26  // higher = smoother wrinkles

// Spring-back with slight overshoot — feels like real foam
function easeOutBack(t) {
  const c1 = 1.25, c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

function accumulateSquishes(base, squishes, now) {
  const out = new Float32Array(base)
  for (const s of squishes) {
    let depth
    if (s.held) {
      const growTime = s.growTime || 600
      const held = Math.min((now - s.startTime) / growTime, 1)
      depth = -(s.minDepth + (s.maxDepth - s.minDepth) * Math.pow(held, 0.4))
    } else {
      const t = Math.min((now - s.releaseTime) / s.duration, 1)
      if (t >= 1) continue
      depth = -s.releaseDepth * (1 - easeOutBack(t))
    }
    const innerR = s.radius
    const outerR = s.radius * 1.6
    for (let i = 0; i < out.length; i += 3) {
      const dx = out[i] - s.px, dy = out[i+1] - s.py, dz = out[i+2] - s.pz
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)
      if (dist < 0.001) continue
      if (dist < innerR) {
        // Finger-press profile: flat contact plateau in the center (the finger pad),
        // then smooth cosine rolloff to zero at the edge — no sharp spike at center.
        const ratio = dist / innerR
        const f = ratio < 0.42
          ? 1.0
          : 0.5 * (1 + Math.cos(Math.PI * (ratio - 0.42) / 0.58))
        out[i]   += s.nx * depth * f
        out[i+1] += s.ny * depth * f
        out[i+2] += s.nz * depth * f
      } else if (dist < outerR) {
        // Outer bulge — foam rises naturally around the pressed zone
        const tt = (dist - innerR) / (outerR - innerR)
        const f = Math.pow(1 - tt, 2) * 0.34
        out[i]   += (dx/dist) * Math.abs(depth) * f
        out[i+1] += (dy/dist) * Math.abs(depth) * f
        out[i+2] += (dz/dist) * Math.abs(depth) * f
      }
    }
  }
  return out
}

function buildBreadGeo() {
  // Bread loaf: wide sphere with flat bottom and slight dome
  const geo = new THREE.SphereGeometry(1, SEGS, SEGS)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    x *= 1.65    // widen
    z *= 0.88    // shallow depth
    // Squash lower half, let top dome rise naturally
    if (y < 0) y *= 0.55  // flat bottom half
    else y = y * 0.88 + 0.08  // dome
    // Hard flat bottom
    y = Math.max(-0.52, y)
    pos.setXYZ(i, x, y, z)
  }
  geo.attributes.position.needsUpdate = true
  geo.computeVertexNormals()
  return geo
}

function buildAvocadoGeo() {
  // Avocado: pear shape — narrow neck at top, wide round bottom
  const geo = new THREE.SphereGeometry(1, SEGS, SEGS)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    const t = (y + 1) / 2  // 0=bottom, 1=top
    // Pear profile: widest at t=0.25 (lower quarter), narrows toward top
    const r = t < 0.3
      ? 1.0 + 0.18 * Math.sin(t / 0.3 * Math.PI)   // round bottom
      : 1.18 - 0.72 * Math.pow((t - 0.3) / 0.7, 0.6)  // taper to neck
    x *= r; z *= r
    y *= 1.3   // elongate
    pos.setXYZ(i, x, y, z)
  }
  geo.attributes.position.needsUpdate = true
  geo.computeVertexNormals()
  return geo
}

// Generic rounded-box helper — used for butter body and chocolate segments
function buildRoundedBoxGeo(w, h, d, segsX, segsY, segsZ, r) {
  const geo = new THREE.BoxGeometry(w, h, d, segsX, segsY, segsZ)
  const pos = geo.attributes.position
  const hx = w/2, hy = h/2, hz = d/2
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    const cx = Math.max(-(hx - r), Math.min(hx - r, x))
    const cy = Math.max(-(hy - r), Math.min(hy - r, y))
    const cz = Math.max(-(hz - r), Math.min(hz - r, z))
    const dx = x - cx, dy = y - cy, dz = z - cz
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)
    if (dist > 1e-5) { pos.setXYZ(i, cx + dx/dist*r, cy + dy/dist*r, cz + dz/dist*r) }
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()
  return geo
}

function buildButterGeo() {
  // Very wide flat slab, minimal edge softening so it reads as a clear rectangle
  return buildRoundedBoxGeo(2.9, 0.82, 0.46, 18, 8, 6, 0.04)
}

function buildChocolateGeo() {
  // Single merged geometry: flat base + 15 rounded-square bumps (5 cols × 3 rows)
  // Merging into one mesh means squish deformation applies to bumps AND base together
  const cols = 5, rows = 3
  const W = 2.5, H = 1.45
  const stepX = W / cols, stepY = H / rows

  const toFlat = g => {
    const f = g.toNonIndexed()
    g.dispose()
    return f
  }

  const base = toFlat(new THREE.BoxGeometry(W, H, 0.42, 8, 5, 2))
  const parts = [base]

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tx = -W/2 + stepX/2 + c * stepX
      const ty = -H/2 + stepY/2 + r * stepY
      const bump = toFlat(buildRoundedBoxGeo(0.42, 0.44, 0.24, 4, 4, 2, 0.09))
      const bPos = bump.attributes.position
      for (let i = 0; i < bPos.count; i++) {
        bPos.setXYZ(i, bPos.getX(i) + tx, bPos.getY(i) + ty, bPos.getZ(i) + 0.25)
      }
      bPos.needsUpdate = true
      parts.push(bump)
    }
  }

  // Manually merge all non-indexed parts into one BufferGeometry
  let total = 0
  for (const g of parts) total += g.attributes.position.count
  const merged = new Float32Array(total * 3)
  let off = 0
  for (const g of parts) {
    merged.set(g.attributes.position.array, off * 3)
    off += g.attributes.position.count
    g.dispose()
  }

  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.BufferAttribute(merged, 3))
  out.computeVertexNormals()
  return out
}

function buildGeometry(geo) {
  switch (geo) {
    case 'bread':             return buildBreadGeo()
    case 'avocado':           return buildAvocadoGeo()
    case 'butter':            return buildButterGeo()
    case 'box': case 'chonk': return new THREE.BoxGeometry(1.6, 1.1, 1.0, 8, 6, 6)
    case 'chocolate':         return buildChocolateGeo()
    case 'torus':             return new THREE.TorusGeometry(0.65, 0.38, 14, 28)
    default:                  return new THREE.SphereGeometry(1, SEGS, SEGS)
  }
}

function findFrontVertices(positions) {
  let maxZ = -Infinity
  for (let i = 0; i < positions.length; i += 3)
    if (positions[i+2] > maxZ) maxZ = positions[i+2]
  // Only take center cluster (small x,y) to avoid tracking corners on box shapes
  const indices = []
  for (let i = 0; i < positions.length; i += 3)
    if (positions[i+2] >= maxZ - 0.14 && Math.abs(positions[i]) < 0.55 && Math.abs(positions[i+1]) < 0.55)
      indices.push(i)
  if (indices.length === 0)
    for (let i = 0; i < positions.length; i += 3)
      if (positions[i+2] >= maxZ - 0.01) indices.push(i)
  return indices
}

function randDir() {
  const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u*u)
  return [r * Math.cos(t), u, r * Math.sin(t)]
}

// Tiny bead eye — like real squishies (solid black, small, no big iris)
function Eye({ pos, face }) {
  const sy = face === 'squishing' ? 0.15 : face === 'rising' ? 0.5 : 1
  return (
    <group position={pos}>
      <mesh scale={[1, sy, 1]}>
        <sphereGeometry args={[0.052, 8, 8]} />
        <meshStandardMaterial color="#0A0A0A" roughness={0.1} metalness={0.3} />
      </mesh>
      {/* Tiny white shine dot */}
      <mesh position={[0.018, 0.018, 0.04]}>
        <sphereGeometry args={[0.014, 5, 5]} />
        <meshStandardMaterial color="white" roughness={0} />
      </mesh>
    </group>
  )
}

function Mouth({ face }) {
  const curve = useMemo(() => {
    if (face === 'squishing') return new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.14, 0.02, 0), new THREE.Vector3(0, 0.1, 0), new THREE.Vector3(0.14, 0.02, 0))
    if (face === 'rising')    return new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.1, 0, 0), new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(0.1, 0, 0))
    return new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.12, 0.04, 0), new THREE.Vector3(0, -0.06, 0), new THREE.Vector3(0.12, 0.04, 0))
  }, [face])
  const geo = useMemo(() => new THREE.TubeGeometry(curve, 12, 0.022, 6, false), [curve])
  return <mesh geometry={geo}><meshStandardMaterial color="#111" roughness={0.4} /></mesh>
}

// Pull a flat tangent-plane point back onto the curved surface so the crack
// hugs the toy instead of floating above it (keeps the wax↔squishy gap ≈ 0).
function snapToSurface(p, radius) {
  p.setLength(radius)
  return p
}

// Glass-drop crack — starburst from impact, with branching, stays localized
function genCracks(center, normal, duration, curved = false) {
  const n = normal.clone().normalize()
  const up = Math.abs(n.y) < 0.85 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
  const t1 = new THREE.Vector3().crossVectors(n, up).normalize()
  const t2 = new THREE.Vector3().crossVectors(n, t1).normalize()

  const primaryCount = 4 + Math.floor(Math.random() * 3)  // 4-6 primary cracks
  const pts = []

  for (let i = 0; i < primaryCount; i++) {
    // Irregular angles — not evenly spaced (glass is chaotic)
    const base = (i / primaryCount) * Math.PI * 2 + (Math.random() - 0.5) * 1.1
    const primaryLen = 0.22 + Math.random() * 0.18  // 0.22-0.40 — visible but local

    const dir = t1.clone().multiplyScalar(Math.cos(base)).add(t2.clone().multiplyScalar(Math.sin(base)))

    // Primary crack — from center outward
    const mid = center.clone().add(dir.clone().multiplyScalar(primaryLen * 0.5))
    const end = center.clone().add(dir.clone().multiplyScalar(primaryLen))
    pts.push(center.clone(), mid, mid.clone(), end)  // two segments for slight zig-zag

    // 1-2 branches off the primary crack
    const branchCount = 1 + Math.floor(Math.random() * 2)
    for (let b = 0; b < branchCount; b++) {
      const branchT = 0.35 + Math.random() * 0.45  // branch start along primary
      const bStart = center.clone().add(dir.clone().multiplyScalar(primaryLen * branchT))
      const bAngle = base + (Math.random() > 0.5 ? 1 : -1) * (0.45 + Math.random() * 0.5)
      const bDir = t1.clone().multiplyScalar(Math.cos(bAngle)).add(t2.clone().multiplyScalar(Math.sin(bAngle)))
      const bLen = primaryLen * (0.3 + Math.random() * 0.35)
      pts.push(bStart, bStart.clone().add(bDir.multiplyScalar(bLen)))
    }
  }

  // On curved toys, snap the flat starburst onto the surface (gap ≈ 0)
  const finalPts = curved ? pts.map(p => snapToSurface(p, center.length() + 0.012)) : pts
  const geo = new THREE.BufferGeometry().setFromPoints(finalPts)
  return { geo, birthTime: performance.now(), duration: duration * 0.5 }
}

function CrackLine({ crack }) {
  const matRef = useRef()
  useFrame(() => {
    if (!matRef.current) return
    const t = Math.min((performance.now() - crack.birthTime) / crack.duration, 1)
    matRef.current.opacity = Math.max(0, Math.pow(1 - t, 1.4) * 0.85)
  })
  return (
    <lineSegments geometry={crack.geo}>
      <lineBasicMaterial ref={matRef} color="#FFFFFF" transparent opacity={0.85} depthTest={false} />
    </lineSegments>
  )
}

// Craquelure crack — irregular polygon cell network (wax/ceramic glaze style)
function genCraquelure(center, normal, duration) {
  const n = normal.clone().normalize()
  const up = Math.abs(n.y) < 0.85 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
  const t1 = new THREE.Vector3().crossVectors(n, up).normalize()
  const t2 = new THREE.Vector3().crossVectors(n, t1).normalize()

  function gp(u, v) {
    return center.clone().add(t1.clone().multiplyScalar(u)).add(t2.clone().multiplyScalar(v))
  }

  const cols = 4 + Math.floor(Math.random() * 2)
  const rows = 3 + Math.floor(Math.random() * 2)
  const W = cols + 1
  const spread = 0.68

  const grid = []
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const u = ((c / cols) - 0.5) * spread * 2 + (Math.random() - 0.5) * 0.24
      const v = ((r / rows) - 0.5) * spread * 1.4 + (Math.random() - 0.5) * 0.24
      grid.push(gp(u, v))
    }
  }

  const pts = []
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const i = r * W + c
      if (c < cols) pts.push(grid[i].clone(), grid[i + 1].clone())
      if (r < rows) pts.push(grid[i].clone(), grid[i + W].clone())
      if (c < cols && r < rows && Math.random() < 0.48)
        pts.push(grid[i].clone(), grid[(r + 1) * W + (c + 1)].clone())
      if (c > 0 && r < rows && Math.random() < 0.38)
        pts.push(grid[i].clone(), grid[(r + 1) * W + (c - 1)].clone())
    }
  }

  const geo = new THREE.BufferGeometry().setFromPoints(pts)
  return { geo, birthTime: performance.now(), duration: duration * 0.75 }
}

function Accessories({ toy }) {
  switch (toy.geometry) {
    case 'avocado': return (
      // Brown oval pit — embedded slightly into front surface
      <mesh position={[0, -0.18, 0.88]}>
        <sphereGeometry args={[0.30, 14, 12]} />
        <meshStandardMaterial color={toy.pitColor || '#7A4E28'} roughness={0.75} />
      </mesh>
    )
    case 'unicorn': return (<>
      <mesh position={[0, 1.25, 0.38]} rotation={[0.35, 0, 0]}><coneGeometry args={[0.1, 0.75, 8]} /><meshStandardMaterial color={toy.hornColor || '#FFD700'} roughness={0.2} metalness={0.7} /></mesh>
      <mesh position={[-0.52, 0.82, 0.16]} rotation={[0, 0, -0.45]}><coneGeometry args={[0.14, 0.38, 6]} /><meshStandardMaterial color={toy.colorDark || '#C070A0'} /></mesh>
      <mesh position={[0.52, 0.82, 0.16]} rotation={[0, 0, 0.45]}><coneGeometry args={[0.14, 0.38, 6]} /><meshStandardMaterial color={toy.colorDark || '#C070A0'} /></mesh>
    </>)
    case 'cat': return (<>
      <mesh position={[-0.58, 0.82, 0.16]} rotation={[0, 0, -0.3]}><coneGeometry args={[0.2, 0.52, 4]} /><meshStandardMaterial color={toy.colorDark || '#C09040'} /></mesh>
      <mesh position={[0.58, 0.82, 0.16]} rotation={[0, 0, 0.3]}><coneGeometry args={[0.2, 0.52, 4]} /><meshStandardMaterial color={toy.colorDark || '#C09040'} /></mesh>
      <mesh position={[-0.54, 0.82, 0.27]} rotation={[0, 0, -0.3]}><coneGeometry args={[0.1, 0.32, 4]} /><meshStandardMaterial color="#FFCCE0" /></mesh>
      <mesh position={[0.54, 0.82, 0.27]} rotation={[0, 0, 0.3]}><coneGeometry args={[0.1, 0.32, 4]} /><meshStandardMaterial color="#FFCCE0" /></mesh>
    </>)
    case 'butter': {
      // Butter label text — matching reference: "SALTED" small top, "BUTTER" large, weight info below
      // Butter front face is at z ≈ 0.23; text sits just in front at z=0.25
      const blue = '#3A68BE'
      const z = 0.25
      return (<>
        <Text position={[0, 0.23, z]} fontSize={0.085} color={blue} anchorX="center" anchorY="middle" letterSpacing={0.14}>SALTED</Text>
        <Text position={[0, 0.00, z]} fontSize={0.28}  color={blue} anchorX="center" anchorY="middle" letterSpacing={0.06}>BUTTER</Text>
        <Text position={[-0.55, -0.27, z]} fontSize={0.085} color={blue} anchorX="center" anchorY="middle">4oz.</Text>
        <Text position={[-0.40, -0.33, z]} fontSize={0.058} color={blue} anchorX="center" anchorY="middle">NET WT. (113 G)</Text>
      </>)
    }
    case 'hamster': return (<>
      {/* Rounded nub ears like the mochi reference */}
      <mesh position={[-0.54, 0.82, 0.22]}><sphereGeometry args={[0.22, 10, 8]} /><meshStandardMaterial color={toy.earColor || '#E8C4A8'} roughness={0.7} /></mesh>
      <mesh position={[0.54, 0.82, 0.22]}><sphereGeometry args={[0.22, 10, 8]} /><meshStandardMaterial color={toy.earColor || '#E8C4A8'} roughness={0.7} /></mesh>
      {/* Inner ear pink */}
      <mesh position={[-0.54, 0.82, 0.38]}><sphereGeometry args={[0.12, 8, 6]} /><meshStandardMaterial color="#F2A0A8" roughness={0.8} /></mesh>
      <mesh position={[0.54, 0.82, 0.38]}><sphereGeometry args={[0.12, 8, 6]} /><meshStandardMaterial color="#F2A0A8" roughness={0.8} /></mesh>
    </>)
    case 'chocolate': return null  // bumps are baked into the merged main geometry
    default: return null
  }
}

// ─── Composed toy (multi-part) ────────────────────────────────────────────────

function ComposedPart({ part, face, onSquishStart, onSquishEnd, riseDuration, spawnCracks, waxed, sharedSquishesRef }) {
  const meshRef = useRef()
  const squishesRef = useRef([])
  const riseRef = useRef()

  const { geo, basePositions } = useMemo(() => {
    const g = buildComposedGeo(part.baseShape ?? 'sphere')
    const count = g.attributes.position.count
    if (part.vertexColors?.length === count * 3) {
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(part.vertexColors), 3))
    } else {
      g.setAttribute('color', new THREE.BufferAttribute(makeVertexColors(g, part.color ?? '#FFB0B0'), 3))
    }
    if (part.positions?.length === g.attributes.position.array.length) {
      const arr = new Float32Array(part.positions)
      g.attributes.position.array.set(arr)
      g.attributes.position.needsUpdate = true
      g.computeVertexNormals()
    }
    return { geo: g, basePositions: new Float32Array(g.attributes.position.array) }
  }, [part.id, part.baseShape, part.positions, part.vertexColors, part.color])

  useFrame(() => {
    if (!meshRef.current) return
    const now = performance.now()
    const all = [...squishesRef.current, ...(sharedSquishesRef?.current ?? [])]
    const active = all.some(s => s.held || (now - s.releaseTime) < s.duration)
    if (!active) return
    const posAttr = meshRef.current.geometry.attributes.position
    const updated = accumulateSquishes(basePositions, all, now)
    posAttr.array.set(updated); posAttr.needsUpdate = true
    meshRef.current.geometry.computeVertexNormals()
  })

  const onPointerDown = useCallback((e) => {
    e.stopPropagation()
    clearTimeout(riseRef.current)
    const scale = 1  // composed parts have no additional scale
    const p = e.point.clone().divideScalar(scale)
    const n = p.clone().normalize()
    const minDepth = 0.13
    squishesRef.current.push({
      px: p.x, py: p.y, pz: p.z, nx: n.x, ny: n.y, nz: n.z,
      minDepth, maxDepth: 0.34, releaseDepth: 0, radius: 0.72,
      held: true, startTime: performance.now(), releaseTime: 0, duration: riseDuration,
    })
    onSquishStart?.()
    if (waxed) {
      spawnCracks?.(p.clone().addScaledVector(n, -minDepth), n)
    } else {
      playSquish()
    }
  }, [riseDuration, onSquishStart, spawnCracks, waxed])

  const onPointerUp = useCallback(() => {
    const now = performance.now()
    squishesRef.current.forEach(s => {
      if (s.held) {
        const held = Math.min((now - s.startTime) / 700, 1)
        s.releaseDepth = s.minDepth + (s.maxDepth - s.minDepth) * Math.pow(held, 0.45)
        s.held = false; s.releaseTime = now
      }
    })
    riseRef.current = setTimeout(() => {
      squishesRef.current = []
      onSquishEnd?.()
    }, riseDuration)
  }, [riseDuration, onSquishEnd])

  return (
    <group position={[part.transform?.x??0, part.transform?.y??0, part.transform?.z??0]} scale={part.partScale ?? 1}>
      <mesh ref={meshRef} geometry={geo}
        onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
        <meshStandardMaterial color="white" vertexColors roughness={0.5} metalness={0.05} />
      </mesh>
    </group>
  )
}

function ComposedToy({ toy, onFaceChange, pendingMove, waxed }) {
  const [face, setFace]   = useState('normal')
  const [cracks, setCracks] = useState([])
  const composition = toy.composition ?? []
  const primary = composition[0]

  const sharedSquishesRef = useRef([])
  const waxedRef          = useRef(waxed)
  const stepTimersRef     = useRef([])
  const riseTimerRef      = useRef(null)
  useEffect(() => { waxedRef.current = waxed }, [waxed])

  const riseDuration = useMemo(() => {
    const { tension, friction, mass } = toy.riseSpeed
    return Math.max(1000, Math.round((mass * friction * 1200) / tension))
  }, [toy.riseSpeed])

  const spawnCracks = useCallback((point, normal) => {
    const crack = genCracks(point, normal, riseDuration, true)
    setCracks(prev => [...prev.slice(-2), crack])
    playCrack()
  }, [riseDuration])

  const onSquishStart = useCallback(() => {
    setFace('squishing'); onFaceChange?.('squishing')
  }, [onFaceChange])

  const onSquishEnd = useCallback(() => {
    setFace('rising'); onFaceChange?.('rising')
    setTimeout(() => { setFace('normal'); onFaceChange?.('normal') }, riseDuration)
  }, [riseDuration, onFaceChange])

  const addPress = useCallback((nx, ny, nz, { minD, maxD, radius, holdMs, growTime }) => {
    const s = {
      px: nx * 0.85, py: ny * 0.85, pz: nz * 0.85,
      nx, ny, nz,
      minDepth: minD, maxDepth: maxD,
      releaseDepth: 0, radius,
      held: true, startTime: performance.now(),
      releaseTime: 0, duration: riseDuration,
      growTime: growTime || 600,
    }
    sharedSquishesRef.current.push(s)
    const t = setTimeout(() => {
      const now = performance.now()
      const held = Math.min((now - s.startTime) / 700, 1)
      s.releaseDepth = s.minDepth + (s.maxDepth - s.minDepth) * Math.pow(held, 0.45)
      s.held = false; s.releaseTime = now
    }, holdMs)
    stepTimersRef.current.push(t)
  }, [riseDuration])

  const scheduleRise = useCallback((delay) => {
    const t = setTimeout(() => {
      setFace('rising'); onFaceChange?.('rising')
      clearTimeout(riseTimerRef.current)
      riseTimerRef.current = setTimeout(() => {
        sharedSquishesRef.current = []
        setFace('normal'); onFaceChange?.('normal')
      }, riseDuration)
    }, delay)
    stepTimersRef.current.push(t)
  }, [riseDuration, onFaceChange])

  useEffect(() => {
    if (!pendingMove?.style) return
    stepTimersRef.current.forEach(clearTimeout)
    stepTimersRef.current = []
    clearTimeout(riseTimerRef.current)
    sharedSquishesRef.current = []

    const style = pendingMove.style
    setFace('squishing'); onFaceChange?.('squishing')
    if (!waxedRef.current) playSquish()

    if (style === 'poke') {
      const [nx, ny, nz] = randDir()
      addPress(nx, ny, nz, { minD: 0.45, maxD: 0.60, radius: 0.65, holdMs: 220, growTime: 400 })
      if (waxedRef.current) spawnCracks(new THREE.Vector3(nx * 0.55, ny * 0.55, nz * 0.55), new THREE.Vector3(nx, ny, nz))
      scheduleRise(240)

    } else if (style === 'squeeze') {
      const [nx, ny, nz] = randDir()
      addPress(nx, ny, nz,    { minD: 0.38, maxD: 0.55, radius: 0.75, holdMs: 500, growTime: 450 })
      addPress(-nx, -ny, -nz, { minD: 0.38, maxD: 0.55, radius: 0.75, holdMs: 500, growTime: 450 })
      if (waxedRef.current) spawnCracks(new THREE.Vector3(nx * 0.62, ny * 0.62, nz * 0.62), new THREE.Vector3(nx, ny, nz))
      scheduleRise(520)

    } else if (style === 'palm') {
      const a = Math.random() * Math.PI * 2
      const raw = [Math.cos(a) * 0.3, 0.95, Math.sin(a) * 0.3]
      const mag = Math.sqrt(raw[0]**2 + raw[1]**2 + raw[2]**2)
      const [nx, ny, nz] = raw.map(v => v / mag)
      addPress(nx, ny, nz, { minD: 0.42, maxD: 0.80, radius: 1.02, holdMs: 900, growTime: 550 })
      if (waxedRef.current) spawnCracks(new THREE.Vector3(nx * 0.58, ny * 0.58, nz * 0.58), new THREE.Vector3(nx, ny, nz))
      scheduleRise(920)

    } else if (style === 'taps') {
      ;[0, 220, 440].forEach(delay => {
        const t = setTimeout(() => {
          const [nx, ny, nz] = randDir()
          addPress(nx, ny, nz, { minD: 0.38, maxD: 0.50, radius: 0.58, holdMs: 140, growTime: 250 })
          if (waxedRef.current) spawnCracks(new THREE.Vector3(nx * 0.62, ny * 0.62, nz * 0.62), new THREE.Vector3(nx, ny, nz))
        }, delay)
        stepTimersRef.current.push(t)
      })
      scheduleRise(600)

    } else if (style === 'knead') {
      const dirs = [[-0.95, 0.1, 0.3], [0.95, 0.1, 0.3], [-0.88, 0.35, -0.3], [0.88, 0.35, -0.3]]
      dirs.forEach(([nx, ny, nz], i) => {
        const mag = Math.sqrt(nx*nx + ny*ny + nz*nz)
        const t = setTimeout(() => {
          addPress(nx/mag, ny/mag, nz/mag, { minD: 0.40, maxD: 0.58, radius: 0.72, holdMs: 320, growTime: 400 })
          if (waxedRef.current) spawnCracks(new THREE.Vector3((nx/mag)*0.60, (ny/mag)*0.60, (nz/mag)*0.60), new THREE.Vector3(nx/mag, ny/mag, nz/mag))
        }, i * 330)
        stepTimersRef.current.push(t)
      })
      scheduleRise(dirs.length * 330 + 340)

    } else if (style === 'pancake') {
      addPress(0,  1, 0, { minD: 0.60, maxD: 0.92, radius: 1.08, holdMs: 800, growTime: 280 })
      addPress(0, -1, 0, { minD: 0.60, maxD: 0.92, radius: 1.08, holdMs: 800, growTime: 280 })
      if (waxedRef.current) {
        spawnCracks(new THREE.Vector3(0,  0.40, 0), new THREE.Vector3(0,  1, 0))
        spawnCracks(new THREE.Vector3(0, -0.40, 0), new THREE.Vector3(0, -1, 0))
      }
      scheduleRise(950)
    }
  }, [pendingMove?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Face position on primary part's front
  const facePosBase = useMemo(() => {
    if (!primary) return [0, 0.06, 1.05]
    const fz = getFrontZ(primary.baseShape ?? 'sphere')
    const tx = primary.transform?.x ?? 0
    const ty = primary.transform?.y ?? 0
    const tz = primary.transform?.z ?? 0
    return [tx, ty + 0.06, tz + fz]
  }, [primary])

  return (
    <group scale={toy.customScale || 1}>
      {composition.map(part => (
        <ComposedPart key={part.id} part={part} face={face}
          onSquishStart={onSquishStart} onSquishEnd={onSquishEnd}
          riseDuration={riseDuration} spawnCracks={spawnCracks} waxed={waxed}
          sharedSquishesRef={sharedSquishesRef} />
      ))}
      {cracks.map((c, i) => <CrackLine key={i} crack={c} />)}
      <group position={facePosBase}>
        <Eye pos={[-0.22, 0.1, 0]} face={face} />
        <Eye pos={[ 0.22, 0.1, 0]} face={face} />
        <Mouth face={face} />
        <mesh position={[-0.42, -0.06, -0.01]}><sphereGeometry args={[0.16, 8, 6]} /><meshStandardMaterial color="#FFB0B0" transparent opacity={0.48} roughness={1} /></mesh>
        <mesh position={[ 0.42, -0.06, -0.01]}><sphereGeometry args={[0.16, 8, 6]} /><meshStandardMaterial color="#FFB0B0" transparent opacity={0.48} roughness={1} /></mesh>
      </group>
    </group>
  )
}

// ─── Main toy router ──────────────────────────────────────────────────────────

export default function DeformableToy({ toy, onFaceChange, pendingMove, waxed }) {
  if (toy.geometry === 'composed') {
    return <ComposedToy toy={toy} onFaceChange={onFaceChange} pendingMove={pendingMove} waxed={waxed} />
  }
  return <SingleDeformableToy toy={toy} onFaceChange={onFaceChange} pendingMove={pendingMove} waxed={waxed} />
}

function SingleDeformableToy({ toy, onFaceChange, pendingMove, waxed }) {
  const meshRef = useRef()
  const faceGroupRef = useRef()
  const squishesRef = useRef([])
  const [face, setFace] = useState('normal')
  const [cracks, setCracks] = useState([])
  const riseTimerRef = useRef(null)
  const stepTimersRef = useRef([])
  const waxedRef = useRef(waxed)
  useEffect(() => { waxedRef.current = waxed }, [waxed])

  const { basePositions, geometry, frontVertexIndices, baseFaceCenter } = useMemo(() => {
    const geo = buildGeometry(toy.geometry)
    if (toy.geometry === 'sculpted' && toy.customPositions?.length) {
      const attr = geo.attributes.position
      const src = new Float32Array(toy.customPositions)
      // src may have been built at SEGS=26; if lengths match, apply directly
      if (src.length === attr.array.length) {
        attr.array.set(src)
        attr.needsUpdate = true
        geo.computeVertexNormals()
      }
    }
    const pos = new Float32Array(geo.attributes.position.array)
    const fvi = findFrontVertices(pos)
    let sx = 0, sy = 0, sz = 0
    for (const idx of fvi) { sx += pos[idx]; sy += pos[idx+1]; sz += pos[idx+2] }
    const n = fvi.length || 1
    return { basePositions: pos, geometry: geo, frontVertexIndices: fvi, baseFaceCenter: [sx/n, sy/n + 0.06, sz/n + 0.04] }
  }, [toy.geometry, toy.customPositions])

  useEffect(() => {
    squishesRef.current = []
    setCracks([])
    setFace('normal')
    if (faceGroupRef.current) faceGroupRef.current.position.set(...baseFaceCenter)
  }, [toy.id, baseFaceCenter])

  const riseDuration = useMemo(() => {
    const { tension, friction, mass } = toy.riseSpeed
    return Math.max(1000, Math.round((mass * friction * 1200) / tension))
  }, [toy.riseSpeed])

  // Press helper used by both invisible hand moves and user pointer
  const addPress = useCallback((nx, ny, nz, { minD, maxD, radius, holdMs, growTime }) => {
    const s = {
      px: nx * 0.85, py: ny * 0.85, pz: nz * 0.85,
      nx, ny, nz,
      minDepth: minD, maxDepth: maxD,
      releaseDepth: 0, radius,
      held: true, startTime: performance.now(),
      releaseTime: 0, duration: riseDuration,
      growTime: growTime || 600,
    }
    squishesRef.current.push(s)
    const t = setTimeout(() => {
      const now = performance.now()
      const held = Math.min((now - s.startTime) / 700, 1)
      s.releaseDepth = s.minDepth + (s.maxDepth - s.minDepth) * Math.pow(held, 0.45)
      s.held = false; s.releaseTime = now
    }, holdMs)
    stepTimersRef.current.push(t)
  }, [riseDuration])

  const scheduleRise = useCallback((delay) => {
    const t = setTimeout(() => {
      setFace('rising'); onFaceChange?.('rising')
      clearTimeout(riseTimerRef.current)
      riseTimerRef.current = setTimeout(() => {
        squishesRef.current = []
        setFace('normal'); onFaceChange?.('normal')
      }, riseDuration)
    }, delay)
    stepTimersRef.current.push(t)
  }, [riseDuration, onFaceChange])

  // Fire a named invisible-hand move when pendingMove.id changes
  useEffect(() => {
    if (!pendingMove?.style) return

    // Cancel any ongoing hand moves
    stepTimersRef.current.forEach(clearTimeout)
    stepTimersRef.current = []
    clearTimeout(riseTimerRef.current)
    squishesRef.current = []

    const style = pendingMove.style
    setFace('squishing'); onFaceChange?.('squishing')
    if (!waxedRef.current) playSquish()

    if (style === 'poke') {
      const [nx, ny, nz] = randDir()
      addPress(nx, ny, nz, { minD: 0.45, maxD: 0.60, radius: 0.65, holdMs: 220, growTime: 400 })
      if (waxedRef.current) spawnCracks(new THREE.Vector3(nx * 0.55, ny * 0.55, nz * 0.55), new THREE.Vector3(nx, ny, nz))
      scheduleRise(240)

    } else if (style === 'squeeze') {
      const [nx, ny, nz] = randDir()
      addPress(nx, ny, nz,    { minD: 0.38, maxD: 0.55, radius: 0.75, holdMs: 500, growTime: 450 })
      addPress(-nx, -ny, -nz, { minD: 0.38, maxD: 0.55, radius: 0.75, holdMs: 500, growTime: 450 })
      if (waxedRef.current) spawnCracks(new THREE.Vector3(nx * 0.62, ny * 0.62, nz * 0.62), new THREE.Vector3(nx, ny, nz))
      scheduleRise(520)

    } else if (style === 'palm') {
      const a = Math.random() * Math.PI * 2
      const raw = [Math.cos(a) * 0.3, 0.95, Math.sin(a) * 0.3]
      const mag = Math.sqrt(raw[0]**2 + raw[1]**2 + raw[2]**2)
      const [nx, ny, nz] = raw.map(v => v / mag)
      addPress(nx, ny, nz, { minD: 0.42, maxD: 0.80, radius: 1.02, holdMs: 900, growTime: 550 })
      if (waxedRef.current) spawnCracks(new THREE.Vector3(nx * 0.58, ny * 0.58, nz * 0.58), new THREE.Vector3(nx, ny, nz))
      scheduleRise(920)

    } else if (style === 'taps') {
      ;[0, 220, 440].forEach(delay => {
        const t = setTimeout(() => {
          const [nx, ny, nz] = randDir()
          addPress(nx, ny, nz, { minD: 0.38, maxD: 0.50, radius: 0.58, holdMs: 140, growTime: 250 })
          if (waxedRef.current) spawnCracks(new THREE.Vector3(nx * 0.62, ny * 0.62, nz * 0.62), new THREE.Vector3(nx, ny, nz))
        }, delay)
        stepTimersRef.current.push(t)
      })
      scheduleRise(600)

    } else if (style === 'knead') {
      const dirs = [[-0.95, 0.1, 0.3], [0.95, 0.1, 0.3], [-0.88, 0.35, -0.3], [0.88, 0.35, -0.3]]
      dirs.forEach(([nx, ny, nz], i) => {
        const mag = Math.sqrt(nx*nx + ny*ny + nz*nz)
        const t = setTimeout(() => {
          addPress(nx/mag, ny/mag, nz/mag, { minD: 0.40, maxD: 0.58, radius: 0.72, holdMs: 320, growTime: 400 })
          if (waxedRef.current) spawnCracks(new THREE.Vector3((nx/mag) * 0.60, (ny/mag) * 0.60, (nz/mag) * 0.60), new THREE.Vector3(nx/mag, ny/mag, nz/mag))
        }, i * 330)
        stepTimersRef.current.push(t)
      })
      scheduleRise(dirs.length * 330 + 340)

    } else if (style === 'pancake') {
      addPress(0,  1, 0, { minD: 0.60, maxD: 0.92, radius: 1.08, holdMs: 800, growTime: 280 })
      addPress(0, -1, 0, { minD: 0.60, maxD: 0.92, radius: 1.08, holdMs: 800, growTime: 280 })
      if (waxedRef.current) {
        spawnCracks(new THREE.Vector3(0,  0.40, 0), new THREE.Vector3(0,  1, 0))
        spawnCracks(new THREE.Vector3(0, -0.40, 0), new THREE.Vector3(0, -1, 0))
      }
      scheduleRise(950)
    }
  }, [pendingMove?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const spawnCracks = useCallback((point, normal) => {
    // Flat-faced toys keep the tangent-plane cracks (already flush with the face);
    // curved toys snap cracks onto the surface so they don't float off it.
    const curved = !['box', 'chonk', 'chocolate', 'butter'].includes(toy.geometry)
    const crack = toy.geometry === 'butter'
      ? genCraquelure(point, normal, riseDuration)
      : genCracks(point, normal, riseDuration, curved)
    setCracks(prev => [...prev.slice(-2), crack])
    playCrack()
  }, [riseDuration, toy.geometry])

  // Manual pointer interaction
  const toyScale = toy.customScale || 1

  const onPointerDown = useCallback((e) => {
    e.stopPropagation()
    clearTimeout(riseTimerRef.current)
    // e.point is world-space; convert to local-space (group is uniformly scaled)
    const p = e.point.clone().divideScalar(toyScale), n = p.clone().normalize()
    const minDepth = 0.13
    squishesRef.current.push({
      px: p.x, py: p.y, pz: p.z, nx: n.x, ny: n.y, nz: n.z,
      minDepth, maxDepth: 0.34, releaseDepth: 0, radius: 0.72,
      held: true, startTime: performance.now(), releaseTime: 0, duration: riseDuration,
    })
    setFace('squishing'); onFaceChange?.('squishing')
    if (waxed) {
      spawnCracks(p.clone().addScaledVector(n, -minDepth), n)
    } else {
      playSquish()
    }
  }, [riseDuration, onFaceChange, spawnCracks, toyScale, waxed])

  const onPointerUp = useCallback(() => {
    const now = performance.now()
    squishesRef.current.forEach(s => {
      if (s.held) {
        const held = Math.min((now - s.startTime) / 700, 1)
        s.releaseDepth = s.minDepth + (s.maxDepth - s.minDepth) * Math.pow(held, 0.45)
        s.held = false; s.releaseTime = now
      }
    })
    setFace('rising'); onFaceChange?.('rising')
    riseTimerRef.current = setTimeout(() => {
      squishesRef.current = []; setFace('normal'); onFaceChange?.('normal')
    }, riseDuration)
  }, [riseDuration, onFaceChange])

  useFrame(() => {
    if (!meshRef.current) return
    const now = performance.now()
    const hasActive = squishesRef.current.some(s => s.held || (now - s.releaseTime) < s.duration)
    const posAttr = meshRef.current.geometry.attributes.position
    if (hasActive) {
      const updated = accumulateSquishes(basePositions, squishesRef.current, now)
      posAttr.array.set(updated); posAttr.needsUpdate = true
      meshRef.current.geometry.computeVertexNormals()
      if (faceGroupRef.current && frontVertexIndices.length > 0) {
        let sx = 0, sy = 0, sz = 0
        for (const idx of frontVertexIndices) { sx += updated[idx]; sy += updated[idx+1]; sz += updated[idx+2] }
        const n = frontVertexIndices.length
        faceGroupRef.current.position.set(sx/n, sy/n + 0.06, sz/n + 0.04)
      }
    } else if (faceGroupRef.current) {
      const [bx, by, bz] = baseFaceCenter, fp = faceGroupRef.current.position
      fp.x += (bx - fp.x) * 0.12; fp.y += (by - fp.y) * 0.12; fp.z += (bz - fp.z) * 0.12
    }
  })

  const isBox = ['box', 'chonk', 'butter', 'chocolate'].includes(toy.geometry)

  return (
    <group scale={toyScale} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          color={toy.color}
          roughness={waxed ? 0.07 : toy.geometry === 'butter' ? 0.86 : toy.geometry === 'chocolate' ? 0.88 : 0.46}
          metalness={waxed ? 0.06 : 0}
        />
      </mesh>
      <Accessories toy={toy} />

      {/* Wax crack lines — fade out over rise duration */}
      {cracks.map((crack, i) => <CrackLine key={i} crack={crack} />)}
      {toy.geometry !== 'chocolate' && (
        <group ref={faceGroupRef} position={baseFaceCenter}>
          <Eye pos={isBox ? [-0.2, 0.08, 0] : [-0.22, 0.1, 0]} face={face} />
          <Eye pos={isBox ? [0.2, 0.08, 0] : [0.22, 0.1, 0]} face={face} />
          <Mouth face={face} />
          <mesh position={[-0.42, -0.06, -0.01]}><sphereGeometry args={[0.16, 8, 6]} /><meshStandardMaterial color={toy.blushColor || '#FFB0B0'} transparent opacity={0.48} roughness={1} /></mesh>
          <mesh position={[0.42, -0.06, -0.01]}><sphereGeometry args={[0.16, 8, 6]} /><meshStandardMaterial color={toy.blushColor || '#FFB0B0'} transparent opacity={0.48} roughness={1} /></mesh>
        </group>
      )}
    </group>
  )
}
