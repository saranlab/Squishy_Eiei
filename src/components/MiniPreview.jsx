import { Canvas } from '@react-three/fiber'
import { OrbitControls, RoundedBox } from '@react-three/drei'

function PreviewShape({ geometry, color }) {
  const roughness = geometry === 'butter' || geometry === 'chocolate' ? 0.88 : 0.85
  const mat = <meshStandardMaterial color={color} roughness={roughness} metalness={0} />
  switch (geometry) {
    case 'box':
      return <RoundedBox args={[1.4, 1.1, 1.2]} radius={0.25} smoothness={4}>{mat}</RoundedBox>
    case 'torus':
      return (
        <group>
          <mesh><torusGeometry args={[0.6, 0.35, 12, 36]} />{mat}</mesh>
        </group>
      )
    case 'star':
      return <mesh><dodecahedronGeometry args={[0.85, 0]} />{mat}</mesh>
    case 'cat':
      return (
        <group>
          <mesh scale={[1.05, 0.95, 1]}><sphereGeometry args={[0.8, 24, 24]} />{mat}</mesh>
          <mesh position={[-0.55, 0.75, 0.1]} rotation={[0, 0, -0.3]}>
            <coneGeometry args={[0.2, 0.5, 4]} />{mat}
          </mesh>
          <mesh position={[0.55, 0.75, 0.1]} rotation={[0, 0, 0.3]}>
            <coneGeometry args={[0.2, 0.5, 4]} />{mat}
          </mesh>
        </group>
      )
    case 'unicorn':
      return (
        <group>
          <mesh><sphereGeometry args={[0.8, 24, 24]} />{mat}</mesh>
          <mesh position={[0, 1.18, 0.35]} rotation={[0.35, 0, 0]}>
            <coneGeometry args={[0.1, 0.75, 8]} />
            <meshStandardMaterial color="#FFD700" roughness={0.2} metalness={0.7} />
          </mesh>
          <mesh position={[-0.52, 0.75, 0.15]} rotation={[0, 0, -0.45]}>
            <coneGeometry args={[0.14, 0.38, 6]} />{mat}
          </mesh>
          <mesh position={[0.52, 0.75, 0.15]} rotation={[0, 0, 0.45]}>
            <coneGeometry args={[0.14, 0.38, 6]} />{mat}
          </mesh>
        </group>
      )
    case 'butter':
      return (
        // Very wide flat slab — no separate accessories, uniform cream wrapper
        <RoundedBox args={[2.0, 0.58, 0.38]} radius={0.09} smoothness={5}>{mat}</RoundedBox>
      )
    case 'chocolate': {
      // Flat base + 5×3 = 15 raised rounded square bumps, matching the reference squishy
      const cols = 5, rows = 3
      const W = 2.0, H = 1.2
      const stepX = W / cols   // 0.40
      const stepY = H / rows   // 0.40
      const bumps = []
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = -W/2 + stepX/2 + c * stepX
          const y = -H/2 + stepY/2 + r * stepY
          bumps.push(
            <group key={`${r}_${c}`} position={[x, y, 0.22]}>
              <RoundedBox args={[0.33, 0.34, 0.22]} radius={0.08} smoothness={3}>{mat}</RoundedBox>
            </group>
          )
        }
      }
      return (
        <group>
          <RoundedBox args={[2.0, 1.2, 0.36]} radius={0.06} smoothness={3}>{mat}</RoundedBox>
          {bumps}
        </group>
      )
    }
    default:
      return <mesh><sphereGeometry args={[0.85, 24, 24]} />{mat}</mesh>
  }
}

export default function MiniPreview({ geometry, color }) {
  return (
    <Canvas
      camera={{ position: [0, 0.4, 3.2], fov: 42 }}
      gl={{ alpha: true, antialias: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.9} color="#fff8f0" />
      <directionalLight position={[3, 4, 3]} intensity={1.2} />
      <hemisphereLight skyColor="#FFF9EC" groundColor="#C68B4A" intensity={0.35} />
      <PreviewShape geometry={geometry} color={color} />
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={5} />
    </Canvas>
  )
}
