import { useRef, useMemo, useCallback, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

const SEGS = 26

const SCULPT_BASE_POS = (() => {
  const g = new THREE.SphereGeometry(1, SEGS, SEGS)
  return new Float32Array(g.attributes.position.array)
})()

function applyBrush(src, hitPoint, normal, delta, radius = 0.55) {
  const out = new Float32Array(src)
  const { x: hx, y: hy, z: hz } = hitPoint
  const { x: nx, y: ny, z: nz } = normal
  for (let i = 0; i < out.length; i += 3) {
    const dx = out[i] - hx, dy = out[i+1] - hy, dz = out[i+2] - hz
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)
    if (dist < radius) {
      const f = (1 - dist / radius) ** 2
      out[i] += nx*delta*f; out[i+1] += ny*delta*f; out[i+2] += nz*delta*f
    }
  }
  return out
}

function SculptMesh({ color, orbitRef, sculptRef, onChange }) {
  const meshRef = useRef()
  const posRef = useRef(new Float32Array(SCULPT_BASE_POS))
  const drag = useRef({ active: false, lastY: 0, point: null, normal: null })
  const onChangeRef = useRef(onChange)

  const geo = useMemo(() => new THREE.SphereGeometry(1, SEGS, SEGS), [])

  // Keep onChange ref fresh so flush never captures a stale callback
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  const flush = useCallback(() => {
    const attr = geo.attributes.position
    attr.array.set(posRef.current)
    attr.needsUpdate = true
    geo.computeVertexNormals()
    onChangeRef.current?.(posRef.current)
  }, [geo])

  // Expose reset + getPositions to parent
  useEffect(() => {
    if (!sculptRef) return
    sculptRef.current = {
      reset() {
        posRef.current = new Float32Array(SCULPT_BASE_POS)
        flush()
      },
      getPositions() { return posRef.current },
    }
  }, [flush, sculptRef])

  const onPointerDown = useCallback((e) => {
    e.stopPropagation()
    const worldNormal = e.face
      ? e.face.normal.clone().transformDirection(meshRef.current.matrixWorld)
      : e.point.clone().normalize()
    drag.current = { active: true, lastY: e.clientY, point: e.point.clone(), normal: worldNormal }
    if (orbitRef?.current) orbitRef.current.enabled = false
  }, [orbitRef])

  const onPointerMove = useCallback((e) => {
    const d = drag.current
    if (!d.active) return
    e.stopPropagation()
    const dy = d.lastY - e.clientY
    d.lastY = e.clientY
    const delta = dy * 0.005
    if (Math.abs(delta) > 0.0001) {
      posRef.current = applyBrush(posRef.current, d.point, d.normal, delta)
      flush()
    }
  }, [flush])

  const onPointerUp = useCallback(() => {
    drag.current.active = false
    if (orbitRef?.current) orbitRef.current.enabled = true
  }, [orbitRef])

  return (
    <mesh
      ref={meshRef}
      geometry={geo}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <meshStandardMaterial color={color} roughness={0.52} metalness={0.05} />
    </mesh>
  )
}

export default function SculptCanvas({ color, onChange }) {
  const orbitRef = useRef()
  const sculptRef = useRef()

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 0.3, 3.4], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
      >
        <ambientLight intensity={0.9} color="#fff8f0" />
        <directionalLight position={[3, 4, 3]} intensity={1.2} />
        <hemisphereLight skyColor="#FFF9EC" groundColor="#C68B4A" intensity={0.35} />
        <SculptMesh color={color} orbitRef={orbitRef} sculptRef={sculptRef} onChange={onChange} />
        <OrbitControls ref={orbitRef} enableZoom={false} enablePan={false} />
      </Canvas>

      <div style={{
        position: 'absolute', top: 6, left: 0, right: 0, textAlign: 'center',
        pointerEvents: 'none', fontSize: 10, color: '#C68B4A',
        fontFamily: "'Nunito',sans-serif", fontWeight: 700, letterSpacing: '0.07em',
      }}>
        DRAG UP / DOWN ON BODY TO SCULPT · ORBIT TO ROTATE
      </div>

      <button
        onClick={() => sculptRef.current?.reset()}
        style={{
          position: 'absolute', bottom: 6, right: 6,
          padding: '3px 10px', borderRadius: 7,
          border: '1.5px solid #E8D8C0', background: 'white',
          fontSize: 10, color: '#A07040', cursor: 'pointer',
          fontFamily: "'Nunito',sans-serif", fontWeight: 700,
        }}
      >
        Reset Shape
      </button>
    </div>
  )
}
