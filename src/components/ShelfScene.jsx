import { Canvas } from '@react-three/fiber'
import { OrbitControls, RoundedBox } from '@react-three/drei'
import SquishyToy3D from './SquishyToy3D'

function Shelf() {
  return (
    <group position={[0, -1.28, 0]}>
      {/* Plank surface */}
      <RoundedBox args={[18, 0.28, 2.2]} radius={0.08} smoothness={4} receiveShadow>
        <meshStandardMaterial color="#C68B4A" roughness={0.9} metalness={0} />
      </RoundedBox>
      {/* Darker underside lip */}
      <mesh position={[0, -0.22, 0]}>
        <boxGeometry args={[18, 0.12, 2.0]} />
        <meshStandardMaterial color="#8B5A20" roughness={1} />
      </mesh>
    </group>
  )
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.7} color="#fff8f0" />
      <directionalLight
        position={[5, 10, 6]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={30}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={6}
        shadow-camera-bottom={-4}
      />
      <hemisphereLight skyColor="#FFF9EC" groundColor="#C68B4A" intensity={0.4} />
      <pointLight position={[-6, 4, 4]} intensity={0.3} color="#FFD580" />
    </>
  )
}

function toyXPosition(index, total) {
  const spacing = Math.min(2.4, 12 / total)
  const totalWidth = (total - 1) * spacing
  return index * spacing - totalWidth / 2
}

export default function ShelfScene({ toys, onRisingChange }) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 0.8, 5.5], fov: 55 }}
      style={{ width: '100%', height: '100%', touchAction: 'none', background: 'transparent' }}
      gl={{ antialias: true, alpha: true }}
    >
      <Lights />
      <Shelf />

      {toys.map((toy, i) => (
        <SquishyToy3D
          key={toy.id}
          toy={toy}
          position={[toyXPosition(i, toys.length), -0.15, 0]}
          onRisingChange={onRisingChange}
        />
      ))}

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enableRotate={true}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.1}
        minAzimuthAngle={-Math.PI / 2.8}
        maxAzimuthAngle={Math.PI / 2.8}
        rotateSpeed={0.6}
      />
    </Canvas>
  )
}
