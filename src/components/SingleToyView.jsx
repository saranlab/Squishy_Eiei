import { useEffect, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import DeformableToy from './DeformableToy'

// Adjusts camera Z so the toy always fits regardless of container aspect ratio
function ResponsiveCamera({ scale }) {
  const { camera, size } = useThree()
  useEffect(() => {
    const aspect = size.width / size.height
    // On portrait / square containers the toy needs to sit further back
    const aspectFactor = aspect < 1.1 ? 1.25 : aspect < 1.6 ? 1.05 : 1.0
    const scaleFactor  = 1 + Math.max(0, scale - 1) * 2.2
    camera.position.z  = 2.4 * scaleFactor * aspectFactor
    camera.updateProjectionMatrix()
  }, [camera, size, scale])
  return null
}

export default function SingleToyView({ toy, pendingMove, waxed }) {
  const scale = toy.customScale || 1

  return (
    <Canvas
      camera={{ position: [0, 0, 2.4], fov: 58 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%', background: 'transparent', touchAction: 'none' }}
    >
      <ResponsiveCamera scale={scale} />

      <ambientLight intensity={0.75} color="#fff8f0" />
      <directionalLight position={[4, 6, 5]} intensity={1.1} />
      <hemisphereLight skyColor="#FFF9EC" groundColor="#F8DDB0" intensity={0.38} />
      {waxed && <pointLight position={[-3, 2, 2]} intensity={1.6} color="#fffbe8" />}
      {waxed && <pointLight position={[3, -1, 3]} intensity={0.9} color="#e8f0ff" />}

      <DeformableToy toy={toy} pendingMove={pendingMove} waxed={waxed} />

      <OrbitControls enablePan={false} enableZoom={false} rotateSpeed={0.8} />
    </Canvas>
  )
}
