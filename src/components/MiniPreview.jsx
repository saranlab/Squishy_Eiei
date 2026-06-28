import { Canvas } from '@react-three/fiber'
import { OrbitControls, RoundedBox } from '@react-three/drei'

function PreviewShape({ geometry, color }) {
  const mat = <meshStandardMaterial color={color} roughness={0.85} metalness={0} />
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
        <group>
          <RoundedBox args={[1.6, 0.85, 1.0]} radius={0.12} smoothness={4}>{mat}</RoundedBox>
          {/* Wrapper foil strip */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1.65, 0.28, 1.05]} />
            <meshStandardMaterial color="#E8D44D" roughness={0.4} metalness={0.3} />
          </mesh>
        </group>
      )
    case 'chocolate':
      return (
        <group>
          <RoundedBox args={[1.5, 0.7, 1.1]} radius={0.1} smoothness={4}>{mat}</RoundedBox>
          {/* Bar segments */}
          {[-0.38, 0, 0.38].map((x) => (
            <mesh key={x} position={[x, 0.36, 0]}>
              <boxGeometry args={[0.34, 0.12, 1.12]} />
              <meshStandardMaterial color="#3B1A08" roughness={0.6} />
            </mesh>
          ))}
          {[-0.38, 0, 0.38].map((x) => (
            <mesh key={`l${x}`} position={[x, 0.36, 0]} rotation={[0, Math.PI / 2, 0]}>
              <boxGeometry args={[0.34, 0.12, 1.52]} />
              <meshStandardMaterial color="#3B1A08" roughness={0.6} />
            </mesh>
          ))}
        </group>
      )
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
