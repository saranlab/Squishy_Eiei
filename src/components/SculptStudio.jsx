import { forwardRef, useRef, useMemo, useCallback, useEffect, useState, useImperativeHandle } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { COMPOSED_SHAPES, buildComposedGeo, getFrontZ, hexToRgb, makeVertexColors } from '../data/shapes'

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

function TextLabel({ text, z }) {
  const texture = useMemo(() => {
    if (!text?.trim()) return null
    const canvas = document.createElement('canvas')
    canvas.width = 512; canvas.height = 128
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, 512, 128)
    ctx.fillStyle = 'rgba(255,255,255,0.88)'
    ctx.beginPath(); ctx.roundRect(6, 6, 500, 116, 18); ctx.fill()
    ctx.fillStyle = '#1A1A1A'
    ctx.font = 'bold 58px "Arial Rounded MT Bold", Arial, sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(text.slice(0, 16), 256, 64)
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [text])

  if (!texture) return null
  return (
    <mesh position={[0, 0, z + 0.015]}>
      <planeGeometry args={[1.15, 0.29]} />
      <meshBasicMaterial map={texture} transparent alphaTest={0.01} depthTest={false} />
    </mesh>
  )
}

// ─── single part mesh ─────────────────────────────────────────────────────────

const PartMesh = forwardRef(({ part, isSelected, mode, brushRadius, paintColor, orbitRef, onSelect }, ref) => {
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
      geo.computeVertexNormals()
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
    if (mode === 'text') return

    const local = meshRef.current.worldToLocal(e.point.clone())
    const fn = e.face?.normal ?? local.clone().normalize()
    drag.current = { active: true, lastY: e.clientY, lx: local.x, ly: local.y, lz: local.z, nx: fn.x, ny: fn.y, nz: fn.z }
    if (orbitRef?.current) orbitRef.current.enabled = false

    if (mode === 'paint') {
      const [pr, pg, pb] = hexToRgb(paintColor)
      colRef.current = applyPaint(colRef.current, posRef.current, local.x, local.y, local.z, pr, pg, pb, brushRadius)
      geo.attributes.color.array.set(colRef.current)
      geo.attributes.color.needsUpdate = true
    }
  }, [isSelected, mode, brushRadius, paintColor, orbitRef, onSelect, part.id, geo])

  const onPointerMove = useCallback((e) => {
    const d = drag.current
    if (!d.active) return
    e.stopPropagation()

    if (mode === 'sculpt') {
      const dy = d.lastY - e.clientY
      d.lastY = e.clientY
      const delta = dy * 0.005
      if (Math.abs(delta) > 0.0002) {
        posRef.current = applyBrush(posRef.current, d.lx, d.ly, d.lz, d.nx, d.ny, d.nz, delta, brushRadius)
        geo.attributes.position.array.set(posRef.current)
        geo.attributes.position.needsUpdate = true
        geo.computeVertexNormals()
      }
    } else if (mode === 'paint') {
      const local = meshRef.current.worldToLocal(e.point.clone())
      const [pr, pg, pb] = hexToRgb(paintColor)
      colRef.current = applyPaint(colRef.current, posRef.current, local.x, local.y, local.z, pr, pg, pb, brushRadius)
      geo.attributes.color.array.set(colRef.current)
      geo.attributes.color.needsUpdate = true
    }
  }, [mode, brushRadius, paintColor, geo])

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

      {/* Gold wireframe highlight on selected part */}
      {isSelected && (
        <mesh geometry={geo} scale={[1.035, 1.035, 1.035]}>
          <meshBasicMaterial color="#FFD700" wireframe transparent opacity={0.18} depthTest={false} />
        </mesh>
      )}

      {part.textLabel?.trim() && <TextLabel text={part.textLabel} z={getFrontZ(part.baseShape)} />}
    </group>
  )
})
PartMesh.displayName = 'PartMesh'

// ─── helpers for panel UI ─────────────────────────────────────────────────────

const LABEL = { fontSize: 10, fontWeight: 700, color: '#A07040', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }

function tabBtn(active) {
  return {
    flex: 1, padding: '6px 2px', borderRadius: 9, cursor: 'pointer',
    border: active ? '2px solid #C68B4A' : '2px solid #E8D8C0',
    background: active ? '#FFF0D8' : 'white',
    fontFamily: "'Fredoka One', cursive", fontSize: 12,
    color: active ? '#7A4A18' : '#A07040',
  }
}

// ─── SculptStudio (main export) ───────────────────────────────────────────────

function partSizeLabel(s) {
  if (s <= 0.45) return 'XS'
  if (s <= 0.75) return 'S'
  if (s <= 1.15) return 'M'
  if (s <= 1.55) return 'L'
  return 'XL'
}

const SculptStudio = forwardRef((_props, ref) => {
  const [parts, setParts] = useState(() => [{ id: `p0_${Date.now()}`, baseShape: 'sphere', color: DEFAULT_COLORS[0], textLabel: '', partScale: 1.0, transform: { x: 0, y: 0, z: 0 } }])
  const [selectedId, setSelectedId] = useState(() => parts[0].id)
  const [mode, setMode] = useState('sculpt')
  const [brushRadius, setBrushRadius] = useState(0.55)
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
    const np = { id: `p${parts.length}_${Date.now()}`, baseShape: 'sphere', color: DEFAULT_COLORS[parts.length % 3], textLabel: '', partScale: 1.0, transform: { x: 0, y: 0, z: 0 } }
    setParts(prev => [...prev, np])
    setSelectedId(np.id)
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

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif" }}>

      {/* 3-D canvas */}
      <div style={{ width: '100%', height: 220, borderRadius: 14, overflow: 'hidden', background: 'linear-gradient(135deg,#FFF9EC,#FFE8C0)', border: '2px solid #E8D8C0', marginBottom: 10 }}>
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
              mode={mode}
              brushRadius={brushRadius}
              paintColor={paintColor}
              orbitRef={orbitRef}
              onSelect={setSelectedId}
            />
          ))}
          <OrbitControls ref={orbitRef} enableZoom={false} enablePan={false} />
        </Canvas>
      </div>

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button style={tabBtn(mode==='sculpt')} onClick={() => setMode('sculpt')}>✍️ Sculpt</button>
        <button style={tabBtn(mode==='paint')}  onClick={() => setMode('paint')}>🎨 Paint</button>
        <button style={tabBtn(mode==='text')}   onClick={() => setMode('text')}>🔤 Text</button>
      </div>

      {/* Sculpt controls */}
      {mode === 'sculpt' && (
        <div style={{ marginBottom: 10, background: '#FFF9F0', borderRadius: 10, padding: '8px 10px', border: '1.5px solid #E8D8C0' }}>
          <span style={LABEL}>Brush Size</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: '#C8A070' }}>S</span>
            <input type="range" min={0.18} max={1.2} step={0.04} value={brushRadius}
              onChange={e => setBrushRadius(+e.target.value)}
              style={{ flex: 1, accentColor: '#C68B4A' }} />
            <span style={{ fontSize: 10, color: '#C8A070' }}>L</span>
          </div>
          <div style={{ fontSize: 9, color: '#B09070', marginTop: 3, textAlign: 'center' }}>
            Drag UP to inflate · DOWN to indent · orbit to rotate view
          </div>
          <button onClick={() => partRefs.current[selectedId]?.resetSculpt()}
            style={{ marginTop: 5, width: '100%', padding: '4px', fontSize: 9, borderRadius: 6, border: '1.5px solid #E8D8C0', background: 'white', color: '#A07040', cursor: 'pointer' }}>
            Reset Shape
          </button>
        </div>
      )}

      {/* Paint controls */}
      {mode === 'paint' && (
        <div style={{ marginBottom: 10, background: '#FFF9F0', borderRadius: 10, padding: '8px 10px', border: '1.5px solid #E8D8C0' }}>
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
            <input type="range" min={0.1} max={0.9} step={0.04} value={brushRadius}
              onChange={e => setBrushRadius(+e.target.value)}
              style={{ flex: 1, accentColor: '#C68B4A' }} />
            <span style={{ fontSize: 10, color: '#C8A070' }}>L</span>
            <button onClick={() => partRefs.current[selectedId]?.resetPaint()}
              style={{ padding: '3px 8px', fontSize: 9, borderRadius: 6, border: '1.5px solid #E8D8C0', background: 'white', color: '#A07040', cursor: 'pointer' }}>
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Text controls */}
      {mode === 'text' && (
        <div style={{ marginBottom: 10, background: '#FFF9F0', borderRadius: 10, padding: '8px 10px', border: '1.5px solid #E8D8C0' }}>
          <span style={LABEL}>Text on Squishy</span>
          <input
            type="text" placeholder="Write something cute..." maxLength={16}
            value={selectedPart?.textLabel ?? ''}
            onChange={e => updatePart(selectedId, { textLabel: e.target.value })}
            style={{ width: '100%', padding: '8px 11px', borderRadius: 9, border: '2px solid #E8D8C0', fontFamily: "'Nunito',sans-serif", fontSize: 14, color: '#7A4A18', background: 'white', outline: 'none', boxSizing: 'border-box' }}
          />
          <div style={{ fontSize: 9, color: '#B09070', marginTop: 4, textAlign: 'center' }}>Text appears on the front of the selected part</div>
        </div>
      )}

      {/* Parts row */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#A07040', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Parts</span>
        {parts.map((p, i) => (
          <button key={p.id} onClick={() => setSelectedId(p.id)} style={{
            flex: 1, padding: '5px 4px', borderRadius: 8, cursor: 'pointer', position: 'relative',
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
        {parts.length < MAX_PARTS && (
          <button onClick={addPart} style={{
            flex: 1, padding: '5px 4px', borderRadius: 8, cursor: 'pointer',
            border: '2px dashed #E8D8C0', background: 'white',
            fontSize: 11, color: '#B09070',
          }}>+ Add</button>
        )}
      </div>

      {/* Selected part details */}
      {selectedPart && (
        <div style={{ background: '#FFF9F0', borderRadius: 10, padding: '10px 10px 8px', border: '1.5px solid #E8D8C0' }}>

          {/* Base shape */}
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

          {/* Base color */}
          <span style={LABEL}>Base Color</span>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
            {['#FFB0B0','#FFDC8C','#FFF8A0','#B0EEB8','#B0C8FF','#D8B0FF','#FFB8D8','#F5F5F5'].map(c => (
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

          {/* Per-piece size */}
          <span style={LABEL}>
            Size — <span style={{ fontWeight: 900, color: '#C68B4A' }}>{partSizeLabel(selectedPart.partScale ?? 1)}</span>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 10, color: '#C8A070' }}>XS</span>
            <input type="range" min={0.3} max={2.0} step={0.05}
              value={selectedPart.partScale ?? 1}
              onChange={e => updatePart(selectedId, { partScale: +e.target.value })}
              style={{ flex: 1, accentColor: '#C68B4A' }}
            />
            <span style={{ fontSize: 10, color: '#C8A070' }}>XL</span>
          </div>

          {/* X / Y / Z position sliders */}
          <span style={LABEL}>Position (X · Y · Z)</span>
          {['x','y','z'].map(axis => (
            <div key={axis} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: axis==='x'?'#E04040':axis==='y'?'#208820':'#3060D0', width: 12 }}>{axis.toUpperCase()}</span>
              <input type="range" min={-2} max={2} step={0.05}
                value={selectedPart.transform[axis]}
                onChange={e => setTransform(axis, +e.target.value)}
                style={{ flex: 1, accentColor: axis==='x'?'#E04040':axis==='y'?'#208820':'#3060D0' }}
              />
              <span style={{ fontSize: 10, color: '#B09070', minWidth: 32, textAlign: 'right' }}>{selectedPart.transform[axis].toFixed(2)}</span>
            </div>
          ))}
          <button onClick={() => updatePart(selectedId, { transform: { x: 0, y: 0, z: 0 }, partScale: 1.0 })}
            style={{ marginTop: 5, width: '100%', padding: '3px', fontSize: 9, borderRadius: 6, border: '1.5px solid #E8D8C0', background: 'white', color: '#A07040', cursor: 'pointer' }}>
            Reset Position & Size
          </button>
        </div>
      )}
    </div>
  )
})
SculptStudio.displayName = 'SculptStudio'
export default SculptStudio
