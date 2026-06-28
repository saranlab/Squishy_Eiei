import { useRef, useMemo, useState, useCallback, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { playSquish, playCrack } from '../SoundEngine'

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
      // easeOutBack gives a tiny bounce-back overshoot — satisfying spring feel
      depth = -s.releaseDepth * (1 - easeOutBack(t))
    }
    const innerR = s.radius
    const outerR = s.radius * 1.55
    for (let i = 0; i < out.length; i += 3) {
      const dx = out[i] - s.px, dy = out[i+1] - s.py, dz = out[i+2] - s.pz
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)
      if (dist < 0.001) continue
      if (dist < innerR) {
        const f = Math.pow(1 - dist / innerR, 2)
        out[i] += s.nx * depth * f; out[i+1] += s.ny * depth * f; out[i+2] += s.nz * depth * f

        // Wrinkle creases — position-based noise so they're irregular, not symmetric rings
        if (dist > 0.06) {
          // Angle in the tangent plane around the press center (breaks ring symmetry)
          const ndot = dx * s.nx + dy * s.ny + dz * s.nz
          const angle = Math.atan2(dy - s.ny * ndot, dx - s.nx * ndot)
          // Multiplied sine waves with different frequencies = aperiodic, won't form faces
          const noise = Math.sin(dist * 7 + angle * 1.9) * Math.cos(dist * 4.3 - angle * 3.1)
          const edgePeak = (dist / innerR) * (1 - dist / innerR) * 4
          const ripple = noise * Math.abs(depth) * 0.13 * edgePeak
          // Wrinkles push tangentially (perpendicular to normal) — physically correct
          out[i]   -= s.nx * ripple; out[i+1] -= s.ny * ripple; out[i+2] -= s.nz * ripple
        }
      } else if (dist < outerR) {
        const tt = (dist - innerR) / (outerR - innerR)
        const f = Math.pow(1 - tt, 2) * 0.45
        out[i] += (dx/dist) * Math.abs(depth) * f
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

function buildGeometry(geo) {
  switch (geo) {
    case 'bread':             return buildBreadGeo()
    case 'avocado':           return buildAvocadoGeo()
    case 'box': case 'chonk': return new THREE.BoxGeometry(1.6, 1.1, 1.0, 8, 6, 6)
    case 'butter':            return new THREE.BoxGeometry(2.2, 0.72, 0.88, 10, 5, 5)
    case 'chocolate':         return new THREE.BoxGeometry(1.5, 1.0, 0.5, 8, 6, 4)
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

// Glass-drop crack — starburst from impact, with branching, stays localized
function genCracks(center, normal, duration) {
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

  const geo = new THREE.BufferGeometry().setFromPoints(pts)
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
      const fc = toy.foilColor || '#C8A820'
      return (<>
        {/* Bottom strip — sits flush under the butter */}
        <mesh position={[0, -0.248, 0]}>
          <boxGeometry args={[2.26, 0.23, 0.92]} />
          <meshStandardMaterial color={fc} roughness={0.62} metalness={0.38} />
        </mesh>
        {/* Left end-cap — foil folded up the side */}
        <mesh position={[-1.108, 0.02, 0]}>
          <boxGeometry args={[0.058, 0.58, 0.92]} />
          <meshStandardMaterial color={fc} roughness={0.62} metalness={0.38} />
        </mesh>
        {/* Right end-cap */}
        <mesh position={[1.108, 0.02, 0]}>
          <boxGeometry args={[0.058, 0.58, 0.92]} />
          <meshStandardMaterial color={fc} roughness={0.62} metalness={0.38} />
        </mesh>
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
    case 'chocolate': return (<>
      <mesh position={[0, 0, 0.26]}><boxGeometry args={[1.5, 0.03, 0.02]} /><meshStandardMaterial color="#3D1A08" roughness={0.6} /></mesh>
      <mesh position={[0.38, 0, 0.26]}><boxGeometry args={[0.02, 1.0, 0.02]} /><meshStandardMaterial color="#3D1A08" roughness={0.6} /></mesh>
      <mesh position={[-0.38, 0, 0.26]}><boxGeometry args={[0.02, 1.0, 0.02]} /><meshStandardMaterial color="#3D1A08" roughness={0.6} /></mesh>
    </>)
    default: return null
  }
}

export default function DeformableToy({ toy, onFaceChange, pendingMove }) {
  const meshRef = useRef()
  const faceGroupRef = useRef()
  const squishesRef = useRef([])
  const [face, setFace] = useState('normal')
  const [cracks, setCracks] = useState([])
  const riseTimerRef = useRef(null)
  const stepTimersRef = useRef([])

  const { basePositions, geometry, frontVertexIndices, baseFaceCenter } = useMemo(() => {
    const geo = buildGeometry(toy.geometry)
    const pos = new Float32Array(geo.attributes.position.array)
    const fvi = findFrontVertices(pos)
    let sx = 0, sy = 0, sz = 0
    for (const idx of fvi) { sx += pos[idx]; sy += pos[idx+1]; sz += pos[idx+2] }
    const n = fvi.length || 1
    return { basePositions: pos, geometry: geo, frontVertexIndices: fvi, baseFaceCenter: [sx/n, sy/n + 0.06, sz/n + 0.04] }
  }, [toy.geometry])

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
    setFace('squishing'); onFaceChange?.('squishing'); playSquish()

    if (style === 'poke') {
      const [nx, ny, nz] = randDir()
      addPress(nx, ny, nz, { minD: 0.45, maxD: 0.60, radius: 0.65, holdMs: 220, growTime: 400 })
      spawnCracks(new THREE.Vector3(nx * 0.85, ny * 0.85, nz * 0.85), new THREE.Vector3(nx, ny, nz))
      scheduleRise(240)

    } else if (style === 'squeeze') {
      const [nx, ny, nz] = randDir()
      addPress(nx, ny, nz,    { minD: 0.38, maxD: 0.55, radius: 0.75, holdMs: 500, growTime: 450 })
      addPress(-nx, -ny, -nz, { minD: 0.38, maxD: 0.55, radius: 0.75, holdMs: 500, growTime: 450 })
      spawnCracks(new THREE.Vector3(nx * 0.85, ny * 0.85, nz * 0.85), new THREE.Vector3(nx, ny, nz))
      scheduleRise(520)

    } else if (style === 'palm') {
      const a = Math.random() * Math.PI * 2
      const raw = [Math.cos(a) * 0.3, 0.95, Math.sin(a) * 0.3]
      const mag = Math.sqrt(raw[0]**2 + raw[1]**2 + raw[2]**2)
      const [nx, ny, nz] = raw.map(v => v / mag)
      addPress(nx, ny, nz, { minD: 0.42, maxD: 0.80, radius: 1.02, holdMs: 900, growTime: 550 })
      spawnCracks(new THREE.Vector3(nx * 0.85, ny * 0.85, nz * 0.85), new THREE.Vector3(nx, ny, nz))
      scheduleRise(920)

    } else if (style === 'taps') {
      ;[0, 220, 440].forEach(delay => {
        const t = setTimeout(() => {
          const [nx, ny, nz] = randDir()
          addPress(nx, ny, nz, { minD: 0.38, maxD: 0.50, radius: 0.58, holdMs: 140, growTime: 250 })
          spawnCracks(new THREE.Vector3(nx * 0.85, ny * 0.85, nz * 0.85), new THREE.Vector3(nx, ny, nz))
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
          spawnCracks(new THREE.Vector3((nx/mag)*0.85, (ny/mag)*0.85, (nz/mag)*0.85), new THREE.Vector3(nx/mag, ny/mag, nz/mag))
        }, i * 330)
        stepTimersRef.current.push(t)
      })
      scheduleRise(dirs.length * 330 + 340)

    } else if (style === 'pancake') {
      // Two hands crush top+bottom — fast flatten, stay flat, then spring back
      addPress(0,  1, 0, { minD: 0.60, maxD: 0.92, radius: 1.08, holdMs: 1800, growTime: 280 })
      addPress(0, -1, 0, { minD: 0.60, maxD: 0.92, radius: 1.08, holdMs: 1800, growTime: 280 })
      spawnCracks(new THREE.Vector3(0, 0.85, 0), new THREE.Vector3(0, 1, 0))
      spawnCracks(new THREE.Vector3(0, -0.85, 0), new THREE.Vector3(0, -1, 0))
      scheduleRise(1820)
    }
  }, [pendingMove?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const spawnCracks = useCallback((point, normal) => {
    const crack = toy.geometry === 'butter'
      ? genCraquelure(point, normal, riseDuration)
      : genCracks(point, normal, riseDuration)
    setCracks(prev => [...prev.slice(-2), crack])
    playCrack()
  }, [riseDuration, toy.geometry])

  // Manual pointer interaction
  const onPointerDown = useCallback((e) => {
    e.stopPropagation()
    clearTimeout(riseTimerRef.current)
    const p = e.point, n = p.clone().normalize()
    squishesRef.current.push({
      px: p.x, py: p.y, pz: p.z, nx: n.x, ny: n.y, nz: n.z,
      minDepth: 0.28, maxDepth: 0.72, releaseDepth: 0, radius: 0.82,
      held: true, startTime: performance.now(), releaseTime: 0, duration: riseDuration,
    })
    setFace('squishing'); onFaceChange?.('squishing'); playSquish()
    spawnCracks(p, n)
  }, [riseDuration, onFaceChange, spawnCracks])

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
    <group onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          color={toy.color}
          roughness={toy.geometry === 'butter' ? 0.28 : 0.46}
          metalness={toy.geometry === 'butter' ? 0.02 : 0.06}
        />
      </mesh>
      <Accessories toy={toy} />

      {/* Wax crack lines — fade out over rise duration */}
      {cracks.map((crack, i) => <CrackLine key={i} crack={crack} />)}
      <group ref={faceGroupRef} position={baseFaceCenter}>
        <Eye pos={isBox ? [-0.2, 0.08, 0] : [-0.22, 0.1, 0]} face={face} />
        <Eye pos={isBox ? [0.2, 0.08, 0] : [0.22, 0.1, 0]} face={face} />
        <Mouth face={face} />
        {/* Big soft blush circles — matching reference photo prominence */}
        <mesh position={[-0.42, -0.06, -0.01]}><sphereGeometry args={[0.16, 8, 6]} /><meshStandardMaterial color={toy.blushColor || '#FFB0B0'} transparent opacity={0.48} roughness={1} /></mesh>
        <mesh position={[0.42, -0.06, -0.01]}><sphereGeometry args={[0.16, 8, 6]} /><meshStandardMaterial color={toy.blushColor || '#FFB0B0'} transparent opacity={0.48} roughness={1} /></mesh>
      </group>
    </group>
  )
}
