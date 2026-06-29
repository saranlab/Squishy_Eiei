import { forwardRef, useRef, useMemo, useCallback, useEffect, useState, useImperativeHandle } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { COMPOSED_SHAPES, buildComposedGeo, getFrontZ, hexToRgb, makeVertexColors, computeWeldedNormals } from '../data/shapes'

const MAX_PARTS = 3
const DEFAULT_COLORS = ['#FFB0B0', '#B0C8FF', '#B0FFB8']
const PAINT_SWATCHES = ['#FF3B3B','#FF9500','#FFCC00','#34C759','#007AFF','#AF52DE','#FF2D55','#5856D6','#30B0C7','#FF6B9D','#000000','#FFFFFF']

// ─── brush math ──────────────────────────────────────────────────────────────

function applyBrush(src, lx, ly, lz, nx, ny, nz, delta, radius) {
  const out = new Float32Array(src)
  for (let i = 0; i < out.length; i += 3) {
    const dx = out[i]-lx, dy = out[i+1]-ly, dz = out[i+2]-lz
    const d = Math.sqrt(dx*dx+dy*dy+dz*dz)
    if (d < radius) {
      const f = (1 - d/radius) ** 2
      out[i] += nx*delta*f; out[i+1] += ny*delta*f; out[i+2] += nz*delta*f
    }
  }
  return out
}

function applyPaint(col, pos, lx, ly, lz, pr, pg, pb, radius) {
  const out = new Float32Array(col)
  const n = pos.length / 3
  for (let i = 0; i < n; i++) {
    const dx = pos[i*3]-lx, dy = pos[i*3+1]-ly, dz = pos[i*3+2]-lz
    const d = Math.sqrt(dx*dx+dy*dy+dz*dz)
    if (d < radius) {
      const f = Math.pow(1 - d/radius, 1.4) * 0.78
      out[i*3]   += (pr - out[i*3])   * f
      out[i*3+1] += (pg - out[i*3+1]) * f
      out[i*3+2] += (pb - out[i*3+2]) * f
    }
  }
  return out
}

// ─── canvas text label ───────────────────────────────────────────────────────

function TextLabel({ text, color = '#1A1A1A', size = 1.0, offsetX = 0, offsetY = 0, z }) {
  const texture = useMemo(() => {
    if (!text?.trim()) return null
    const canvas = document.createElement('canvas')
    canvas.width = 512; canvas.height = 128
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, 512, 128)
    ctx.fillStyle = 'rgba(255,255,255,0.88)'
    ctx.beginPath()
    const [rx, ry, rw, rh, rr] = [6, 6, 500, 116, 18]
    if (ctx.roundRect) {
      ctx.roundRect(rx, ry, rw, rh, rr)
    } else {
      ctx.moveTo(rx+rr, ry); ctx.lineTo(rx+rw-rr, ry)
      ctx.arcTo(rx+rw, ry, rx+rw, ry+rr, rr); ctx.lineTo(rx+rw, ry+rh-rr)
      ctx.arcTo(rx+rw, ry+rh, rx+rw-rr, ry+rh, rr); ctx.lineTo(rx+rr, ry+rh)
      ctx.arcTo(rx, ry+rh, rx, ry+rh-rr, rr); ctx.lineTo(rx, ry+rr)
      ctx.arcTo(rx, ry, rx+rr, ry, rr); ctx.closePath()
    }
    ctx.fill()
    ctx.fillStyle = color
    const fontSize = Math.round(58 * size)
    ctx.font = `bold ${fontSize}px "Arial Rounded MT Bold", Arial, sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(text.slice(0, 16), 256, 64)
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [text, color, size])

  if (!texture) return null
  return (
    <mesh position={[offsetX, offsetY, z + 0.015]}>
      <planeGeometry args={[1.15, 0.29]} />
      <meshBasicMaterial map={texture} transparent alphaTest={0.01} depthTest={false} />
    </mesh>
  )
}

// ─── single part mesh ─────────────────────────────────────────────────────────

const PartMesh = forwardRef(({ part, isSelected, panel, brushRadius, paintColor, orbitRef, onSelect, showWireframe }, ref) => {
  const meshRef = useRef()
  const posRef = useRef(null)
  const colRef = useRef(null)
  const drag = useRef({ active: false, lastY: 0, lx: 0, ly: 0, lz: 0, nx: 0, ny: 0, nz: 0 })

  // Rebuild geo when base shape or part id changes
  const geo = useMemo(() => {
    const g = buildComposedGeo(part.baseShape)
    const colors = makeVertexColors(g, part.color)
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return g
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part.id, part.baseShape])

  // Init refs from fresh geo
  useEffect(() => {
    posRef.current = new Float32Array(geo.attributes.position.array)
    colRef.current = makeVertexColors(geo, part.color)
    geo.attributes.color.array.set(colRef.current)
    geo.attributes.color.needsUpdate = true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo])

  // When base color changes, repaint all vertices
  const prevColorRef = useRef(part.color)
  useEffect(() => {
    if (prevColorRef.current === part.color || !colRef.current || !geo) return
    prevColorRef.current = part.color
    const [r, g, b] = hexToRgb(part.color)
    const n = colRef.current.length / 3
    for (let i = 0; i < n; i++) { colRef.current[i*3]=r; colRef.current[i*3+1]=g; colRef.current[i*3+2]=b }
    geo.attributes.color.array.set(colRef.current)
    geo.attributes.color.needsUpdate = true
  }, [part.color, geo])

  useImperativeHandle(ref, () => ({
    getData: () => ({
      positions:    posRef.current ? Array.from(posRef.current) : null,
      vertexColors: colRef.current ? Array.from(colRef.current) : null,
    }),
    resetSculpt() {
      const g = buildComposedGeo(part.baseShape)
      posRef.current = new Float32Array(g.attributes.position.array)
      geo.attributes.position.array.set(posRef.current)
      geo.attributes.position.needsUpdate = true
      computeWeldedNormals(geo)
    },
    resetPaint() {
      const [r, g, b] = hexToRgb(part.color)
      const n = colRef.current.length / 3
      for (let i = 0; i < n; i++) { colRef.current[i*3]=r; colRef.current[i*3+1]=g; colRef.current[i*3+2]=b }
      geo.attributes.color.array.set(colRef.current)
      geo.attributes.color.needsUpdate = true
    },
  }), [part.baseShape, part.color, geo])

  const onPointerDown = useCallback((e) => {
    if (!isSelected) { onSelect(part.id); return }
    e.stopPropagation()
    if (panel !== 'sculpt' && panel !== 'paint') return

    const local = meshRef.current.worldToLocal(e.point.clone())
    const fn = e.face?.normal ?? local.clone().normalize()
    drag.current = { active: true, lastY: e.clientY, lx: local.x, ly: local.y, lz: local.z, nx: fn.x, ny: fn.y, nz: fn.z }
    if (orbitRef?.current) orbitRef.current.enabled = false

    if (panel === 'paint') {
      const [pr, pg, pb] = hexToRgb(paintColor)
      colRef.current = applyPaint(colRef.current, posRef.current, local.x, local.y, local.z, pr, pg, pb, brushRadius)
      geo.attributes.color.array.set(colRef.current)
      geo.attributes.color.needsUpdate = true
    }
  }, [isSelected, panel, brushRadius, paintColor, orbitRef, onSelect, part.id, geo])

  const onPointerMove = useCallback((e) => {
    const d = drag.current
    if (!d.active) return
    e.stopPropagation()

    if (panel === 'sculpt') {
      const dy = d.lastY - e.clientY
      d.lastY = e.clientY
      const delta = dy * 0.005
      if (Math.abs(delta) > 0.0002) {
        posRef.current = applyBrush(posRef.current, d.lx, d.ly, d.lz, d.nx, d.ny, d.nz, delta, brushRadius)
        geo.attributes.position.array.set(posRef.current)
        geo.attributes.position.needsUpdate = true
        computeWeldedNormals(geo)
      }
    } else if (panel === 'paint') {
      const local = meshRef.current.worldToLocal(e.point.clone())
      const [pr, pg, pb] = hexToRgb(paintColor)
      colRef.current = applyPaint(colRef.current, posRef.current, local.x, local.y, local.z, pr, pg, pb, brushRadius)
      geo.attributes.color.array.set(colRef.current)
      geo.attributes.color.needsUpdate = true
    }
  }, [panel, brushRadius, paintColor, geo])

  const onPointerUp = useCallback(() => {
    drag.current.active = false
    if (orbitRef?.current) orbitRef.current.enabled = true
  }, [orbitRef])

  return (
    <group position={[part.transform.x, part.transform.y, part.transform.z]} scale={part.partScale ?? 1}>
      <mesh
        ref={meshRef} geometry={geo}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <meshStandardMaterial color="white" vertexColors roughness={0.52} metalness={0.05} />
      </mesh>

      {/* Gold wireframe highlight on selected part (toggleable) */}
      {isSelected && showWireframe && (
        <mesh geometry={geo} scale={[1.035, 1.035, 1.035]}>
          <meshBasicMaterial color="#FFD700" wireframe transparent opacity={0.18} depthTest={false} />
        </mesh>
      )}

      {part.textLabel?.trim() && (
        <TextLabel
          text={part.textLabel}
          color={part.textColor ?? '#1A1A1A'}
          size={part.textSize ?? 1.0}
          offsetX={part.textOffsetX ?? 0}
          offsetY={part.textOffsetY ?? 0}
          z={getFrontZ(part.baseShape)}
        />
      )}
    </group>
  )
})
PartMesh.displayName = 'PartMesh'

// ─── helpers for panel UI ─────────────────────────────────────────────────────

const LABEL = { fontSize: 10, fontWeight: 700, color: '#A07040', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }

// ─── SculptStudio (main export) ───────────────────────────────────────────────

function partSizeLabel(s) {
  if (s <= 0.45) return 'XS'
  if (s <= 0.75) return 'S'
  if (s <= 1.15) return 'M'
  if (s <= 1.55) return 'L'
  return 'XL'
}

const SIDEBAR_ICONS = [
  { id: 'sculpt',   emoji: '✍️', title: 'Sculpt'    },
  { id: 'paint',    emoji: '🎨', title: 'Paint'     },
  { id: 'text',     emoji: '🔤', title: 'Text'      },
  { id: 'add',      emoji: '➕', title: 'Add Part'  },
  { id: 'position', emoji: '📐', title: 'Position'  },
  { id: 'color',    emoji: '🖌️', title: 'Color'     },
  { id: 'size',     emoji: '⚖️', title: 'Size'      },
]

function mkPart(idx) {
  return { id: `p${idx}_${Date.now()}`, baseShape: 'sphere', color: DEFAULT_COLORS[idx % 3], textLabel: '', textColor: '#1A1A1A', textSize: 1.0, textOffsetX: 0, textOffsetY: 0, partScale: 1.0, transform: { x: 0, y: 0, z: 0 } }
}

// ─── face preview components (canvas-only, no squish animation) ───────────────

function PreviewEye({ pos, expression }) {
  if (expression === 'dead') {
    return (
      <group position={pos}>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.1, 0.018, 0.01]} />
          <meshStandardMaterial color="#0A0A0A" />
        </mesh>
        <mesh rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.1, 0.018, 0.01]} />
          <meshStandardMaterial color="#0A0A0A" />
        </mesh>
      </group>
    )
  }
  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[0.052, 8, 8]} />
        <meshStandardMaterial color="#0A0A0A" roughness={0.1} metalness={0.3} />
      </mesh>
      <mesh position={[0.018, 0.018, 0.04]}>
        <sphereGeometry args={[0.014, 5, 5]} />
        <meshStandardMaterial color="white" roughness={0} />
      </mesh>
    </group>
  )
}

function PreviewMouth({ expression }) {
  const curve = useMemo(() => {
    if (expression === 'cry')
      return new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.12,-0.04,0), new THREE.Vector3(0,0.06,0), new THREE.Vector3(0.12,-0.04,0))
    if (expression === 'dead')
      return new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.1,0,0), new THREE.Vector3(0,0,0), new THREE.Vector3(0.1,0,0))
    return new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.12,0.04,0), new THREE.Vector3(0,-0.06,0), new THREE.Vector3(0.12,0.04,0))
  }, [expression])

  const tubeGeo = useMemo(
    () => expression !== 'openmouth' ? new THREE.TubeGeometry(curve, 12, 0.022, 6, false) : null,
    [curve, expression]
  )

  if (expression === 'openmouth') {
    return (
      <mesh position={[0, -0.04, 0]}>
        <circleGeometry args={[0.065, 12]} />
        <meshStandardMaterial color="#111" roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
    )
  }
  return <mesh geometry={tubeGeo}><meshStandardMaterial color="#111" roughness={0.4} /></mesh>
}

function FaceOverlay({ parts, faceExpression, faceAngle, faceElevation, faceOffsetX, faceOffsetY, facePieceIndex = 0 }) {
  const primary = parts[facePieceIndex] ?? parts[0]
  if (!primary || !faceExpression || faceExpression === 'none') return null

  const fz  = getFrontZ(primary.baseShape ?? 'sphere') * (primary.partScale ?? 1)
  const tx  = primary.transform?.x ?? 0
  const ty  = primary.transform?.y ?? 0
  const tz  = primary.transform?.z ?? 0
  const ox  = faceOffsetX ?? 0
  const oy  = faceOffsetY ?? 0
  const a   = ((faceAngle ?? 0) * Math.PI) / 180
  const e   = ((faceElevation ?? 0) * Math.PI) / 180

  const facePos = [
    tx + ox + Math.sin(a) * Math.cos(e) * fz,
    ty + oy + Math.sin(e) * fz,
    tz + Math.cos(a) * Math.cos(e) * fz,
  ]
  const faceRot = new THREE.Euler(-e, a, 0, 'YXZ')

  return (
    <group position={facePos} rotation={faceRot}>
      <PreviewEye pos={[-0.22, 0.1, 0]} expression={faceExpression} />
      <PreviewEye pos={[ 0.22, 0.1, 0]} expression={faceExpression} />
      <PreviewMouth expression={faceExpression} />
      {faceExpression === 'cry' && (<>
        <mesh position={[-0.22, 0.02, 0]}>
          <sphereGeometry args={[0.026, 6, 6]} />
          <meshStandardMaterial color="#88AAFF" transparent opacity={0.88} roughness={0.1} />
        </mesh>
        <mesh position={[0.22, 0.02, 0]}>
          <sphereGeometry args={[0.026, 6, 6]} />
          <meshStandardMaterial color="#88AAFF" transparent opacity={0.88} roughness={0.1} />
        </mesh>
      </>)}
      <mesh position={[-0.42, -0.06, -0.01]}>
        <sphereGeometry args={[0.16, 8, 6]} />
        <meshStandardMaterial color="#FFB0B0" transparent opacity={0.48} roughness={1} />
      </mesh>
      <mesh position={[0.42, -0.06, -0.01]}>
        <sphereGeometry args={[0.16, 8, 6]} />
        <meshStandardMaterial color="#FFB0B0" transparent opacity={0.48} roughness={1} />
      </mesh>
    </group>
  )
}

const SculptStudio = forwardRef(({ faceExpression = 'smile', faceAngle = 0, faceElevation = 0, faceOffsetX = 0, faceOffsetY = 0, facePieceIndex = 0 }, ref) => {
  const [parts, setParts] = useState(() => [mkPart(0)])
  const [selectedId, setSelectedId] = useState(() => parts[0].id)
  const [panel, setPanel] = useState('sculpt')
  const [showWireframe, setShowWireframe] = useState(true)
  const [brushRadius, setBrushRadius] = useState(0.35)
  const [paintColor, setPaintColor] = useState('#FF3B3B')

  const orbitRef = useRef()
  const partRefs = useRef({})   // id → { getData, resetSculpt, resetPaint }

  useImperativeHandle(ref, () => ({
    getComposition: () => parts.map(p => ({ ...p, ...(partRefs.current[p.id]?.getData() ?? {}) }))
  }), [parts])

  const selectedPart = parts.find(p => p.id === selectedId) ?? parts[0]

  const updatePart = useCallback((id, changes) =>
    setParts(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p))
  , [])

  const addPart = useCallback(() => {
    if (parts.length >= MAX_PARTS) return
    const np = mkPart(parts.length)
    setParts(prev => [...prev, np])
    setSelectedId(np.id)
    setPanel('sculpt')
  }, [parts.length])

  const removePart = useCallback((id) => {
    if (parts.length <= 1) return
    const rest = parts.filter(p => p.id !== id)
    setParts(rest)
    if (selectedId === id) setSelectedId(rest[0].id)
  }, [parts, selectedId])

  const setTransform = useCallback((axis, val) => {
    updatePart(selectedId, { transform: { ...selectedPart.transform, [axis]: val } })
  }, [selectedId, selectedPart, updatePart])

  const BASE_COLORS = ['#FFB0B0','#FFDC8C','#FFF8A0','#B0EEB8','#B0C8FF','#D8B0FF','#FFB8D8','#F5F5F5']

  const iconBtn = (id) => ({
    width: 30, height: 30, borderRadius: 9, cursor: 'pointer', padding: 0, fontSize: 14,
    border: panel === id ? '2px solid #C68B4A' : '2px solid #E8D8C0',
    background: panel === id ? '#FFF0D8' : 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  })

  const panelBox = { marginBottom: 8, background: '#FFF9F0', borderRadius: 10, padding: '8px 10px', border: '1.5px solid #E8D8C0' }

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif" }}>

      {/* Canvas row + right sidebar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'flex-start' }}>

        {/* 3-D canvas */}
        <div style={{ flex: 1, height: 220, borderRadius: 14, overflow: 'hidden', background: 'linear-gradient(135deg,#FFF9EC,#FFE8C0)', border: '2px solid #E8D8C0' }}>
          <Canvas camera={{ position: [0, 0.4, 4.2], fov: 44 }} gl={{ antialias: true, alpha: true }} style={{ touchAction: 'none' }}>
            <ambientLight intensity={0.9} color="#fff8f0" />
            <directionalLight position={[3, 4, 3]} intensity={1.2} />
            <hemisphereLight skyColor="#FFF9EC" groundColor="#C68B4A" intensity={0.35} />
            {parts.map(part => (
              <PartMesh
                key={part.id}
                ref={el => { el ? partRefs.current[part.id] = el : delete partRefs.current[part.id] }}
                part={part}
                isSelected={part.id === selectedId}
                panel={panel}
                brushRadius={brushRadius}
                paintColor={paintColor}
                orbitRef={orbitRef}
                onSelect={setSelectedId}
                showWireframe={showWireframe}
              />
            ))}
            <FaceOverlay parts={parts} faceExpression={faceExpression} faceAngle={faceAngle} faceElevation={faceElevation} faceOffsetX={faceOffsetX} faceOffsetY={faceOffsetY} facePieceIndex={facePieceIndex} />
            <OrbitControls ref={orbitRef} enableZoom={false} enablePan={false} />
          </Canvas>
        </div>

        {/* Right sidebar icons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {SIDEBAR_ICONS.map(ico => (
            <button key={ico.id} onClick={() => setPanel(ico.id)} title={ico.title} style={iconBtn(ico.id)}>
              {ico.emoji}
            </button>
          ))}
          {/* Wireframe toggle — visually distinct from panel buttons */}
          <div style={{ marginTop: 6, borderTop: '1.5px solid #E8D8C0', paddingTop: 5 }}>
            <button
              onClick={() => setShowWireframe(w => !w)}
              title={showWireframe ? 'Hide Wireframe' : 'Show Wireframe'}
              style={{
                width: 30, padding: '4px 0', borderRadius: 8, cursor: 'pointer',
                border: showWireframe ? '2px solid #D4AA00' : '2px dashed #C8C0A0',
                background: showWireframe ? '#FFFBE0' : '#F8F7F2',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
              }}
            >
              <span style={{ fontSize: 13, lineHeight: 1 }}>⬡</span>
              <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.02em', color: showWireframe ? '#8A6A00' : '#A09870' }}>WIRE</span>
            </button>
          </div>
        </div>
      </div>

      {/* Parts row */}
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#A07040', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Parts</span>
        {parts.map((p, i) => (
          <button key={p.id} onClick={() => setSelectedId(p.id)} style={{
            flex: 1, padding: '4px 3px', borderRadius: 8, cursor: 'pointer', position: 'relative',
            border: p.id===selectedId ? '2px solid #C68B4A' : '2px solid #E8D8C0',
            background: p.id===selectedId ? '#FFF0D8' : 'white',
            fontSize: 11, color: '#7A4A18',
          }}>
            <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: p.color, marginRight: 3, verticalAlign: 'middle', border: '1px solid #ccc' }} />
            {i+1}
            {parts.length > 1 && p.id===selectedId && (
              <span onClick={e => { e.stopPropagation(); removePart(p.id) }}
                style={{ position: 'absolute', top: -6, right: -6, width: 14, height: 14, borderRadius: '50%', background: '#D03030', color: 'white', fontSize: 10, lineHeight: '14px', textAlign: 'center', cursor: 'pointer', zIndex: 1 }}>×</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Sculpt panel ── */}
      {panel === 'sculpt' && (
        <div style={panelBox}>
          <span style={LABEL}>Brush Size</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: '#C8A070' }}>S</span>
            <input type="range" min={0.06} max={1.2} step={0.02} value={brushRadius}
              onChange={e => setBrushRadius(+e.target.value)} style={{ flex: 1, accentColor: '#C68B4A' }} />
            <span style={{ fontSize: 10, color: '#C8A070' }}>L</span>
          </div>
          <div style={{ fontSize: 9, color: '#B09070', marginTop: 3, textAlign: 'center' }}>
            Drag UP to inflate · DOWN to indent · orbit to rotate
          </div>
          <button onClick={() => partRefs.current[selectedId]?.resetSculpt()}
            style={{ marginTop: 5, width: '100%', padding: '4px', fontSize: 9, borderRadius: 6, border: '1.5px solid #E8D8C0', background: 'white', color: '#A07040', cursor: 'pointer' }}>
            Reset Shape
          </button>
        </div>
      )}

      {/* ── Paint panel ── */}
      {panel === 'paint' && (
        <div style={panelBox}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 7 }}>
            {PAINT_SWATCHES.map(c => (
              <button key={c} onClick={() => setPaintColor(c)} style={{
                width: 25, height: 25, borderRadius: '50%', background: c, cursor: 'pointer',
                border: paintColor===c ? '3px solid #7A4A18' : '2px solid #E8D8C0',
                outline: paintColor===c ? '2px solid white' : 'none', outlineOffset: -3,
                transform: paintColor===c ? 'scale(1.18)' : 'scale(1)', transition: 'transform 0.1s',
              }} />
            ))}
            <label style={{ position: 'relative', cursor: 'pointer' }}>
              <div style={{ width: 25, height: 25, borderRadius: '50%', background: 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)', border: '2px solid #E8D8C0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>+</div>
              <input type="color" value={paintColor} onChange={e => setPaintColor(e.target.value)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: '#C8A070' }}>S</span>
            <input type="range" min={0.04} max={0.9} step={0.02} value={brushRadius}
              onChange={e => setBrushRadius(+e.target.value)} style={{ flex: 1, accentColor: '#C68B4A' }} />
            <span style={{ fontSize: 10, color: '#C8A070' }}>L</span>
            <button onClick={() => partRefs.current[selectedId]?.resetPaint()}
              style={{ padding: '3px 8px', fontSize: 9, borderRadius: 6, border: '1.5px solid #E8D8C0', background: 'white', color: '#A07040', cursor: 'pointer' }}>
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ── Text panel ── */}
      {panel === 'text' && selectedPart && (
        <div style={panelBox}>
          <span style={LABEL}>Text on Squishy</span>
          <input
            type="text" placeholder="Write something cute..." maxLength={16}
            value={selectedPart.textLabel ?? ''}
            onChange={e => updatePart(selectedId, { textLabel: e.target.value })}
            style={{ width: '100%', padding: '7px 10px', borderRadius: 9, border: '2px solid #E8D8C0', fontFamily: "'Nunito',sans-serif", fontSize: 13, color: '#7A4A18', background: 'white', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#A07040', flexShrink: 0 }}>COLOR</span>
            {['#1A1A1A','#FF3B3B','#007AFF','#34C759','#FF9500','#FFFFFF'].map(c => (
              <button key={c} onClick={() => updatePart(selectedId, { textColor: c })} style={{
                width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer',
                border: (selectedPart.textColor ?? '#1A1A1A') === c ? '3px solid #C68B4A' : '2px solid #CCC',
              }} />
            ))}
            <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)', border: '2px solid #E8D8C0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>+</div>
              <input type="color" value={selectedPart.textColor ?? '#1A1A1A'} onChange={e => updatePart(selectedId, { textColor: e.target.value })} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#A07040', flexShrink: 0, width: 34 }}>SIZE</span>
            <input type="range" min={0.4} max={1.6} step={0.1} value={selectedPart.textSize ?? 1.0}
              onChange={e => updatePart(selectedId, { textSize: +e.target.value })} style={{ flex: 1, accentColor: '#C68B4A' }} />
            <span style={{ fontSize: 10, color: '#B09070', minWidth: 24 }}>{((selectedPart.textSize ?? 1.0) * 100).toFixed(0)}%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#E04040', width: 34, flexShrink: 0 }}>X</span>
            <input type="range" min={-0.6} max={0.6} step={0.05} value={selectedPart.textOffsetX ?? 0}
              onChange={e => updatePart(selectedId, { textOffsetX: +e.target.value })} style={{ flex: 1, accentColor: '#E04040' }} />
            <span style={{ fontSize: 10, color: '#B09070', minWidth: 28 }}>{(selectedPart.textOffsetX ?? 0).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#208820', width: 34, flexShrink: 0 }}>Y</span>
            <input type="range" min={-0.6} max={0.6} step={0.05} value={selectedPart.textOffsetY ?? 0}
              onChange={e => updatePart(selectedId, { textOffsetY: +e.target.value })} style={{ flex: 1, accentColor: '#208820' }} />
            <span style={{ fontSize: 10, color: '#B09070', minWidth: 28 }}>{(selectedPart.textOffsetY ?? 0).toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* ── Add panel ── */}
      {panel === 'add' && (
        <div style={panelBox}>
          <span style={LABEL}>Add Part</span>
          {parts.length < MAX_PARTS ? (
            <button onClick={addPart} style={{ width: '100%', padding: '10px', borderRadius: 10, border: '2px dashed #C68B4A', background: 'white', cursor: 'pointer', fontFamily: "'Fredoka One', cursive", fontSize: 14, color: '#7A4A18' }}>
              ➕ Add Another Part
            </button>
          ) : (
            <div style={{ textAlign: 'center', fontSize: 11, color: '#C8A070', padding: '6px 0' }}>Max {MAX_PARTS} parts reached</div>
          )}
        </div>
      )}

      {/* ── Position panel ── */}
      {panel === 'position' && selectedPart && (
        <div style={panelBox}>
          <span style={LABEL}>Position (X · Y · Z)</span>
          {['x','y','z'].map(axis => (
            <div key={axis} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: axis==='x'?'#E04040':axis==='y'?'#208820':'#3060D0', width: 14 }}>{axis.toUpperCase()}</span>
              <input type="range" min={-2} max={2} step={0.05}
                value={selectedPart.transform[axis]}
                onChange={e => setTransform(axis, +e.target.value)}
                style={{ flex: 1, accentColor: axis==='x'?'#E04040':axis==='y'?'#208820':'#3060D0' }}
              />
              <span style={{ fontSize: 10, color: '#B09070', minWidth: 32, textAlign: 'right' }}>{selectedPart.transform[axis].toFixed(2)}</span>
            </div>
          ))}
          <button onClick={() => updatePart(selectedId, { transform: { x: 0, y: 0, z: 0 } })}
            style={{ marginTop: 4, width: '100%', padding: '3px', fontSize: 9, borderRadius: 6, border: '1.5px solid #E8D8C0', background: 'white', color: '#A07040', cursor: 'pointer' }}>
            Reset Position
          </button>
        </div>
      )}

      {/* ── Color + Shape panel ── */}
      {panel === 'color' && selectedPart && (
        <div style={panelBox}>
          <span style={LABEL}>Base Shape</span>
          <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
            {COMPOSED_SHAPES.map(s => (
              <button key={s.id} onClick={() => updatePart(selectedId, { baseShape: s.id })} style={{
                flex: 1, padding: '5px 3px', borderRadius: 8, cursor: 'pointer',
                border: selectedPart.baseShape===s.id ? '2px solid #C68B4A' : '2px solid #E8D8C0',
                background: selectedPart.baseShape===s.id ? '#FFF0D8' : 'white',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
              }}>
                <span style={{ fontSize: 15 }}>{s.emoji}</span>
                <span style={{ fontSize: 8, color: '#A07040', fontWeight: 700 }}>{s.label}</span>
              </button>
            ))}
          </div>
          <span style={LABEL}>Base Color</span>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {BASE_COLORS.map(c => (
              <button key={c} onClick={() => updatePart(selectedId, { color: c })} style={{
                width: 25, height: 25, borderRadius: '50%', background: c, cursor: 'pointer',
                border: selectedPart.color===c ? '3px solid #7A4A18' : '2px solid #E8D8C0',
              }} />
            ))}
            <label style={{ position: 'relative', cursor: 'pointer' }}>
              <div style={{ width: 25, height: 25, borderRadius: '50%', background: 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)', border: '2px solid #E8D8C0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>+</div>
              <input type="color" value={selectedPart.color} onChange={e => updatePart(selectedId, { color: e.target.value })} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
            </label>
          </div>
        </div>
      )}

      {/* ── Size panel ── */}
      {panel === 'size' && selectedPart && (
        <div style={panelBox}>
          <span style={LABEL}>
            Size — <span style={{ fontWeight: 900, color: '#C68B4A' }}>{partSizeLabel(selectedPart.partScale ?? 1)}</span>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: '#C8A070' }}>XS</span>
            <input type="range" min={0.3} max={2.0} step={0.05}
              value={selectedPart.partScale ?? 1}
              onChange={e => updatePart(selectedId, { partScale: +e.target.value })}
              style={{ flex: 1, accentColor: '#C68B4A' }}
            />
            <span style={{ fontSize: 10, color: '#C8A070' }}>XL</span>
          </div>
          <button onClick={() => updatePart(selectedId, { partScale: 1.0 })}
            style={{ width: '100%', padding: '3px', fontSize: 9, borderRadius: 6, border: '1.5px solid #E8D8C0', background: 'white', color: '#A07040', cursor: 'pointer' }}>
            Reset Size
          </button>
        </div>
      )}

    </div>
  )
})
SculptStudio.displayName = 'SculptStudio'
export default SculptStudio
